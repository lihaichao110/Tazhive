import { useEffect, type RefObject } from 'react'
import Panzoom from '@panzoom/panzoom'

interface UseMermaidPanzoomOptions {
  readonly enabled: boolean
  readonly frameRef: RefObject<HTMLDivElement | null>
  readonly graphClassName: string
  readonly renderKey: string
}

const restoreStyle = (element: Element, style: string | null): void => {
  if (style === null) {
    element.removeAttribute('style')
    return
  }

  element.setAttribute('style', style)
}

// 为 Mermaid SVG 提供拖拽、滚轮及移动端双指缩放，不对外暴露工具栏操作。
export function useMermaidPanzoom({
  enabled,
  frameRef,
  graphClassName,
  renderKey,
}: UseMermaidPanzoomOptions): void {
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
    }
  }, [enabled, frameRef, graphClassName, renderKey])
}
