// @vitest-environment happy-dom

import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'

import { ResponseChart } from './ResponseChart'

const { chartDispose, chartResize, chartSetOption, disconnect, echartsInit, observe, callbacks } =
  vi.hoisted(() => ({
    chartDispose: vi.fn(),
    chartResize: vi.fn(),
    chartSetOption: vi.fn(),
    disconnect: vi.fn(),
    echartsInit: vi.fn(),
    observe: vi.fn(),
    callbacks: [] as ResizeObserverCallback[],
  }))

vi.mock('echarts/core', () => ({ init: echartsInit, use: vi.fn() }))
vi.mock('echarts/charts', () => ({ BarChart: {}, LineChart: {}, PieChart: {} }))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  LegendComponent: {},
  TooltipComponent: {},
}))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

let host: HTMLDivElement | undefined
let root: Root | undefined

describe('ResponseChart', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    callbacks.length = 0
    echartsInit.mockReturnValue({
      dispose: chartDispose,
      resize: chartResize,
      setOption: chartSetOption,
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(callback)
      }
      observe = observe
      disconnect = disconnect
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host?.remove()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('创建图表并在尺寸变化和卸载时释放实例', () => {
    act(() =>
      root?.render(
        <ResponseChart
          chart={{
            chartId: 'chart_consultation',
            type: 'bar',
            title: '各险种咨询量',
            data: [{ name: '医疗险', value: 86 }],
          }}
        />,
      ),
    )

    expect(host?.querySelector('[data-chart-id="chart_consultation"]')).not.toBeNull()
    expect(echartsInit).toHaveBeenCalledTimes(1)
    expect(chartSetOption).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenCalledTimes(1)
    callbacks[0]?.([], {} as ResizeObserver)
    expect(chartResize).toHaveBeenCalledTimes(1)

    act(() => root?.unmount())
    root = undefined
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(chartDispose).toHaveBeenCalledTimes(1)
  })
})
