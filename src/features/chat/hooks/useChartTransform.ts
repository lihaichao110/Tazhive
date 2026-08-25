import {
  type KeyboardEventHandler,
  type PointerEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  INITIAL_TRANSFORM,
  clampScale,
  getCenter,
  getDistance,
  toCanvasPoint,
  type ChartTransform,
  type Point,
  zoomAroundPoint,
} from '../lib/chartTransform'

const KEYBOARD_SCALE_STEP = 0.2
const WHEEL_ZOOM_SENSITIVITY = 0.0015
const WHEEL_END_DELAY_MS = 120

interface PanSnapshot {
  readonly mode: 'pan'
  readonly pointerId: number
  readonly startPoint: Point
  readonly transform: ChartTransform
}

interface PinchSnapshot {
  readonly mode: 'pinch'
  readonly pointerIds: readonly [number, number]
  readonly startCenter: Point
  readonly startDistance: number
  readonly transform: ChartTransform
}

type GestureSnapshot = PanSnapshot | PinchSnapshot

// 每次指针数量变化时重建手势基线，保证单指与双指模式切换时画面不跳变。
function createGestureSnapshot(
  element: HTMLDivElement,
  pointers: ReadonlyMap<number, Point>,
  transform: ChartTransform,
): GestureSnapshot | null {
  const entries = [...pointers.entries()]
  const first = entries[0]
  if (!first) return null

  const second = entries[1]
  if (!second) {
    return {
      mode: 'pan',
      pointerId: first[0],
      startPoint: first[1],
      transform,
    }
  }

  return {
    mode: 'pinch',
    pointerIds: [first[0], second[0]],
    startCenter: toCanvasPoint(element, getCenter(first[1], second[1])),
    startDistance: getDistance(first[1], second[1]),
    transform,
  }
}

// 浏览器可能以像素、行或页上报滚轮距离，统一成近似像素后才能保持缩放手感一致。
function normalizeWheelDelta(event: WheelEvent, element: HTMLDivElement): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * element.clientHeight
  return event.deltaY
}

// 管理图表画布的滚轮缩放、指针平移、双指缩放和键盘操作。
export function useChartTransform() {
  const [transform, setTransform] = useState<ChartTransform>(INITIAL_TRANSFORM)
  const [isInteracting, setIsInteracting] = useState(false)
  // 高频事件从 ref 读取最新值，避免事件监听器捕获过期的 React 状态。
  const transformRef = useRef<ChartTransform>(INITIAL_TRANSFORM)
  const pointersRef = useRef(new Map<number, Point>())
  const gestureRef = useRef<GestureSnapshot | null>(null)
  const wheelEndTimerRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(
    () => () => {
      if (wheelEndTimerRef.current !== null) window.clearTimeout(wheelEndTimerRef.current)
    },
    [],
  )

  // 状态驱动渲染，ref 则为同一帧内连续输入提供同步快照，两者必须一起更新。
  const updateTransform = useCallback((next: ChartTransform) => {
    transformRef.current = next
    setTransform(next)
  }, [])

  const resetTransform = useCallback(() => {
    updateTransform(INITIAL_TRANSFORM)
  }, [updateTransform])

  const scheduleWheelEnd = useCallback(() => {
    if (wheelEndTimerRef.current !== null) window.clearTimeout(wheelEndTimerRef.current)
    wheelEndTimerRef.current = window.setTimeout(() => {
      wheelEndTimerRef.current = null
      if (pointersRef.current.size === 0) setIsInteracting(false)
    }, WHEEL_END_DELAY_MS)
  }, [])

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      event.preventDefault()
      const delta = normalizeWheelDelta(event, canvas)
      const current = transformRef.current
      const scale = current.scale * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY)
      // 以鼠标所在位置作为缩放锚点，避免缩放时目标内容从指针下漂移。
      const anchor = toCanvasPoint(canvas, {
        x: event.clientX,
        y: event.clientY,
      })

      setIsInteracting(true)
      updateTransform(zoomAroundPoint(current, scale, anchor))
      scheduleWheelEnd()
    },
    [scheduleWheelEnd, updateTransform],
  )

  const setCanvasRef = useCallback(
    (element: HTMLDivElement | null) => {
      canvasRef.current?.removeEventListener('wheel', handleWheel)
      canvasRef.current = element
      // 必须使用非 passive 原生监听器，才能阻止页面滚动并将滚轮交给画布缩放。
      element?.addEventListener('wheel', handleWheel, { passive: false })
    },
    [handleWheel],
  )

  useEffect(
    () => () => {
      canvasRef.current?.removeEventListener('wheel', handleWheel)
    },
    [handleWheel],
  )

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const pointers = pointersRef.current
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
    // 第二根手指加入时重新记录中心、距离与变换，作为 pinch 的稳定起点。
    gestureRef.current = createGestureSnapshot(event.currentTarget, pointers, transformRef.current)
    setIsInteracting(true)
  }, [])

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const pointers = pointersRef.current
      if (!pointers.has(event.pointerId)) return

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const gesture = gestureRef.current
      if (!gesture) return

      if (gesture.mode === 'pan') {
        const point = pointers.get(gesture.pointerId)
        if (!point) return

        updateTransform({
          ...gesture.transform,
          x: gesture.transform.x + point.x - gesture.startPoint.x,
          y: gesture.transform.y + point.y - gesture.startPoint.y,
        })
        return
      }

      const first = pointers.get(gesture.pointerIds[0])
      const second = pointers.get(gesture.pointerIds[1])
      if (!first || !second || gesture.startDistance === 0) return

      const center = toCanvasPoint(event.currentTarget, getCenter(first, second))
      const scale = clampScale(
        gesture.transform.scale * (getDistance(first, second) / gesture.startDistance),
      )
      // 缩放前后的手势中心应指向同一图表位置，因此平移量需按缩放比例同步修正。
      const ratio = scale / gesture.transform.scale
      updateTransform({
        x: center.x - ratio * (gesture.startCenter.x - gesture.transform.x),
        y: center.y - ratio * (gesture.startCenter.y - gesture.transform.y),
        scale,
      })
    },
    [updateTransform],
  )

  const handlePointerEnd: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    const pointers = pointersRef.current
    if (!pointers.delete(event.pointerId)) return

    // 双指抬起一指后，以剩余指针和当前变换建立新的平移基线。
    gestureRef.current = createGestureSnapshot(event.currentTarget, pointers, transformRef.current)
    setIsInteracting(pointers.size > 0)
  }, [])

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const current = transformRef.current
      if (event.key === '0') {
        event.preventDefault()
        resetTransform()
        return
      }

      const direction = event.key === '+' || event.key === '=' ? 1 : event.key === '-' ? -1 : 0
      if (direction === 0) return

      event.preventDefault()
      updateTransform(
        zoomAroundPoint(current, current.scale + direction * KEYBOARD_SCALE_STEP, { x: 0, y: 0 }),
      )
    },
    [resetTransform, updateTransform],
  )

  return {
    transform,
    isInteracting,
    resetTransform,
    setCanvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleKeyDown,
  }
}
