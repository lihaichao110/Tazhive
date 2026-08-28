// @vitest-environment happy-dom

import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMermaidPanzoom } from './useMermaidPanzoom'

const { panzoom, panzoomFactory } = vi.hoisted(() => ({
  panzoom: {
    destroy: vi.fn(),
    reset: vi.fn(),
    resetStyle: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
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

// 渲染真实 SVG 结构，验证 Hook 与第三方实例的完整生命周期。
function PanzoomHarness({ enabled = true, renderKey = 'first' }: HarnessProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const controls = useMermaidPanzoom({
    enabled,
    frameRef,
    graphClassName: 'graph',
    renderKey,
  })

  return (
    <div ref={frameRef}>
      <div className="graph" style={{ overflow: 'auto' }}>
        <svg style={{ cursor: 'grab' }}>
          <g />
        </svg>
      </div>
      <button type="button" onClick={controls.zoomIn}>
        放大
      </button>
      <button type="button" onClick={controls.zoomOut}>
        缩小
      </button>
      <button type="button" onClick={controls.reset}>
        重置
      </button>
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

  it('使用移动端和缩放边界配置初始化 SVG', () => {
    act(() => root.render(<PanzoomHarness />))

    const svg = host.querySelector('svg')
    expect(panzoomFactory).toHaveBeenCalledWith(svg, {
      canvas: true,
      maxScale: 3,
      minScale: 0.5,
      pinchAndPan: true,
      step: 0.2,
    })
  })

  it('将工具栏和滚轮操作交给同一个 Panzoom 实例', () => {
    act(() => root.render(<PanzoomHarness />))

    const buttons = host.querySelectorAll('button')
    buttons.forEach((button) => act(() => button.click()))
    host.querySelector('.graph')?.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }))

    expect(panzoom.zoomIn).toHaveBeenCalledOnce()
    expect(panzoom.zoomOut).toHaveBeenCalledOnce()
    expect(panzoom.reset).toHaveBeenCalledOnce()
    expect(panzoom.zoomWithWheel).toHaveBeenCalledOnce()
  })

  it('禁用或更换渲染键时销毁旧实例并恢复原始样式', () => {
    act(() => root.render(<PanzoomHarness />))
    const graph = host.querySelector<HTMLElement>('.graph')
    const svg = host.querySelector<SVGSVGElement>('svg')
    if (!graph || !svg) throw new Error('测试图表未渲染')
    graph.style.touchAction = 'none'
    svg.style.transform = 'scale(2)'

    act(() => root.render(<PanzoomHarness renderKey="second" />))

    expect(panzoom.destroy).toHaveBeenCalledOnce()
    expect(panzoom.resetStyle).toHaveBeenCalledOnce()
    expect(graph.style.overflow).toBe('auto')
    expect(graph.style.touchAction).toBe('')
    expect(svg.style.cursor).toBe('grab')
    expect(svg.style.transform).toBe('')

    act(() => root.render(<PanzoomHarness enabled={false} renderKey="second" />))
    expect(panzoom.destroy).toHaveBeenCalledTimes(2)
  })
})
