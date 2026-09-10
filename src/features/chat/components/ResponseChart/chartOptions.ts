import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { ResponseChart } from '../../model/types'

export type ResponseChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>

const AXIS_LABEL_COLOR = '#666a70'
const GRID_LINE_COLOR = '#e5e5e5'
const ACCENT_COLOR = '#028550'
const PIE_COLORS = ['#028550', '#35a873', '#7bc9a4', '#bce4d2', '#f1c75b', '#e88b68']

function createCartesianOption(chart: ResponseChart): ResponseChartOption {
  const isLine = chart.type === 'line'
  return {
    tooltip: { trigger: 'axis', axisPointer: isLine ? undefined : { type: 'shadow' } },
    grid: { top: 16, right: 16, bottom: 32, left: 44 },
    xAxis: {
      type: 'category',
      boundaryGap: !isLine,
      data: chart.data.map((datum) => datum.name),
      axisLabel: { color: AXIS_LABEL_COLOR, interval: 0 },
      axisLine: { lineStyle: { color: GRID_LINE_COLOR } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: AXIS_LABEL_COLOR },
      splitLine: { lineStyle: { color: GRID_LINE_COLOR } },
    },
    series: isLine
      ? [
          {
            name: chart.title,
            type: 'line',
            smooth: true,
            symbolSize: 7,
            data: chart.data.map((datum) => datum.value),
            itemStyle: { color: ACCENT_COLOR },
            lineStyle: { color: ACCENT_COLOR, width: 3 },
            areaStyle: { color: 'rgba(2, 133, 80, 0.12)' },
          },
        ]
      : [
          {
            name: chart.title,
            type: 'bar',
            barMaxWidth: 36,
            data: chart.data.map((datum) => datum.value),
            itemStyle: { color: ACCENT_COLOR, borderRadius: [4, 4, 0, 0] },
          },
        ],
  }
}

// 将受控领域数据转换成固定 ECharts 配置，模型无法注入函数或任意配置项。
export function createResponseChartOption(chart: ResponseChart): ResponseChartOption {
  if (chart.type !== 'pie') return createCartesianOption(chart)

  return {
    color: PIE_COLORS,
    tooltip: { trigger: 'item', formatter: '{b}：{c}（{d}%）' },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: AXIS_LABEL_COLOR, fontSize: 11 },
    },
    series: [
      {
        name: chart.title,
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
        data: chart.data.map((datum) => ({ name: datum.name, value: datum.value })),
      },
    ],
  }
}
