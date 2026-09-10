import { useMemo } from 'react'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use as registerEChartsModules } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

import type { ResponseChart as ResponseChartModel } from '../../model/types'
import { createResponseChartOption } from './chartOptions'
import { useEChart } from './useEChart'
import styles from './ResponseChart.module.scss'

registerEChartsModules([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

interface ResponseChartProps {
  readonly chart: ResponseChartModel
}

// 在正文标记位置渲染一张经过协议校验的响应图表。
export function ResponseChart({ chart }: ResponseChartProps) {
  const option = useMemo(() => createResponseChartOption(chart), [chart])
  const chartRef = useEChart(option)

  return (
    <figure className={styles.card} data-chart-id={chart.chartId}>
      <figcaption className={styles.title}>{chart.title}</figcaption>
      <div
        ref={chartRef}
        className={styles.chart}
        role="img"
        aria-label={`${chart.title}${chart.type === 'pie' ? '饼图' : chart.type === 'bar' ? '柱状图' : '折线图'}`}
      />
    </figure>
  )
}
