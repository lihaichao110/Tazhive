// @vitest-environment happy-dom

import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMermaidPanzoom } from './useMermaidPanzoom'

const { panzoom, panzoomFactory } = vi.hoisted(() => ({
  panzoom: {
    destroy: vi.fn(),
    resetStyle: vi.fn(),
    zoomWithWheel: vi.fn(),
  },
  panzoomFactory: vi.fn(),
}))

vi.mock('@panzoom/panzoom', () => ({
  default: panzoomFactory.mockReturnValue(panzoom),
}))

interface HarnessProps {
  readonly enabled?: boolean
  readonly renderKey?: string
}

function PanzoomHarness({ enabled = true, renderKey = 'first' }: HarnessProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  useMermaidPanzoom({ enabled, frameRef, graphClassName: 'graph', renderKey })

  return (
    <div ref={frameRef}>
      <div className="graph" style={{ overflow: 'auto' }}>
        <svg style={{ cursor: 'grab' }}>
          <g />
        </svg>
      </div>
    </div>
  )
}

describe('useMermaidPanzoom', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    panzoomFactory.mockClear()
    Object.values(panzoom).forEach((mock) => mock.mockClear())
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('使用移动端双指缩放配置初始化 SVG', () => {
    act(() => root.render(<PanzoomHarness />))

    expect(panzoomFactory).toHaveBeenCalledWith(host.querySelector('svg'), {
      canvas: true,
      maxScale: 3,
      minScale: 0.5,
      pinchAndPan: true,
      step: 0.2,
    })
  })

  it('保留滚轮缩放并在重新渲染时销毁旧实例、恢复样式', () => {
    act(() => root.render(<PanzoomHarness />))
    const graph = host.querySelector<HTMLElement>('.graph')
    const svg = host.querySelector<SVGSVGElement>('svg')
    if (!graph || !svg) throw new Error('测试图表未渲染')

    graph.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }))
    expect(panzoom.zoomWithWheel).toHaveBeenCalledOnce()

    graph.style.touchAction = 'none'
    svg.style.transform = 'scale(2)'
    act(() => root.render(<PanzoomHarness renderKey="second" />))

    expect(panzoom.destroy).toHaveBeenCalledOnce()
    expect(panzoom.resetStyle).toHaveBeenCalledOnce()
    expect(graph.style.overflow).toBe('auto')
    expect(graph.style.touchAction).toBe('')
    expect(svg.style.cursor).toBe('grab')
    expect(svg.style.transform).toBe('')
  })
})
