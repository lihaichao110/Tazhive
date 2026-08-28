import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'

interface UseMermaidPanzoomOptions {
  readonly enabled: boolean
  readonly frameRef: RefObject<HTMLDivElement | null>
  readonly graphClassName: string
  readonly renderKey: string
}

interface MermaidPanzoomControls {
  readonly reset: () => void
  readonly zoomIn: () => void
  readonly zoomOut: () => void
}

const restoreStyle = (element: Element, style: string | null): void => {
  if (style === null) {
    element.removeAttribute('style')
    return
  }

  element.setAttribute('style', style)
}

// 使用 Panzoom 统一管理 Mermaid SVG 的鼠标、滚轮与移动端触摸交互。
export function useMermaidPanzoom({
  enabled,
  frameRef,
  graphClassName,
  renderKey,
}: UseMermaidPanzoomOptions): MermaidPanzoomControls {
  const panzoomRef = useRef<PanzoomObject | null>(null)

  useEffect(() => {
    if (!enabled) return

    const graph = frameRef.current?.querySelector<HTMLElement>(`.${graphClassName}`)
    const svg = graph?.querySelector<SVGSVGElement>('svg')
    if (!graph || !svg) return

    const graphStyle = graph.getAttribute('style')
    const svgStyle = svg.getAttribute('style')
    const panzoom = Panzoom(svg, {
      canvas: true,
      maxScale: 3,
      minScale: 0.5,
      pinchAndPan: true,
      step: 0.2,
    })
    panzoomRef.current = panzoom

    const handleWheel = (event: WheelEvent): void => {
      panzoom.zoomWithWheel(event)
    }
    graph.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      graph.removeEventListener('wheel', handleWheel)
      panzoom.destroy()
      panzoom.resetStyle()
      restoreStyle(graph, graphStyle)
      restoreStyle(svg, svgStyle)
      if (panzoomRef.current === panzoom) panzoomRef.current = null
    }
  }, [enabled, frameRef, graphClassName, renderKey])

  const reset = useCallback((): void => {
    panzoomRef.current?.reset()
  }, [])
  const zoomIn = useCallback((): void => {
    panzoomRef.current?.zoomIn()
  }, [])
  const zoomOut = useCallback((): void => {
    panzoomRef.current?.zoomOut()
  }, [])

  return useMemo(() => ({ reset, zoomIn, zoomOut }), [reset, zoomIn, zoomOut])
}
