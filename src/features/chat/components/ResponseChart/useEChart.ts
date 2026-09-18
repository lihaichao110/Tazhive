import { useEffect, useRef, type RefObject } from 'react'
import { init } from 'echarts/core'

import type { ResponseChart as ResponseChartModel } from '../../model/types'
import { createResponseChartOption } from './chartOptions'

// 管理单个 ECharts 实例：按容器实际宽度生成配置，并确保尺寸变化与卸载时正确同步资源。
export function useEChart(chart: ResponseChartModel): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chartInstance = init(container)
    // 标签是否倾斜取决于容器宽度，因此初始渲染与每次尺寸变化都需重建配置；
    // setOption 缺省为合并模式，新旧角度与留白会被显式覆盖，不会残留。
    const applyOption = () => {
      chartInstance.setOption(createResponseChartOption(chart, container.clientWidth))
    }
    applyOption()

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.resize()
      applyOption()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chartInstance.dispose()
    }
  }, [chart])

  return containerRef
}
