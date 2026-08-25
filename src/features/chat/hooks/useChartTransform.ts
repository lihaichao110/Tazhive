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

function normalizeWheelDelta(event: WheelEvent, element: HTMLDivElement): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * element.clientHeight
  return event.deltaY
}

export function useChartTransform() {
  const [transform, setTransform] = useState<ChartTransform>(INITIAL_TRANSFORM)
  const [isInteracting, setIsInteracting] = useState(false)
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
