import { useEffect, useRef, type RefObject } from 'react'
import { init } from 'echarts/core'

import type { ResponseChartOption } from './chartOptions'

// 管理单个 ECharts 实例，并确保容器尺寸变化与组件卸载时正确同步资源。
export function useEChart(option: ResponseChartOption): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = init(container)
    chart.setOption(option)

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [option])

  return containerRef
}
