import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

import type { ResponseChart } from '../../model/types'
import styles from './ResponseChart.module.scss'

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
const GRID_LEFT = 44
const GRID_RIGHT = 16
const GRID_BOTTOM = 32
const AXIS_LABEL_FONT_SIZE = 12
const AXIS_LABEL_MARGIN = 8
const AXIS_LABEL_ROTATE_DEGREE = 45
// 倾斜标签底部留白上限：图表高度约 260px，超限会过度压缩绘图区，极端长标签宁可被裁剪。
const ROTATED_GRID_BOTTOM_MAX = 112

// 保留默认方向选择，并在两侧空间都不足时约束边界；允许滚动查看超长内容。
const TOOLTIP_LAYOUT: TooltipComponentOption = {
  renderMode: 'html',
  confine: true,
  className: styles.tooltip,
  enterable: true,
}

// 类目标签的摆放方案：倾斜角度与所需的底部留白。
interface AxisLabelLayout {
  readonly rotate: number
  readonly gridBottom: number
}

// 按字符近似估算标签像素宽度：CJK 等全角字符按一个字宽，其余按 0.6 倍字号。
// ECharts 在 setOption 前无法测量文本，只能用该保守估算预判是否重叠。
function estimateLabelWidth(name: string): number {
  let width = 0
  for (const char of name) {
    width += char.charCodeAt(0) > 0xff ? AXIS_LABEL_FONT_SIZE : AXIS_LABEL_FONT_SIZE * 0.6
  }
  return width
}

// 依据容器宽度判断类目标签水平摆放是否会重叠：每条标签可用的水平槽位约为
// 绘图区宽度均分，最长标签超出槽位时改为 45° 倾斜，并按标签竖直投影
// （宽度 × √2/2 + 字高 + 轴线间距）放大底部留白，避免倾斜标签被绘图区裁掉。
function resolveAxisLabelLayout(names: readonly string[], containerWidth: number): AxisLabelLayout {
  if (names.length === 0) return { rotate: 0, gridBottom: GRID_BOTTOM }

  const plotWidth = Math.max(containerWidth - GRID_LEFT - GRID_RIGHT, 1)
  const slotWidth = plotWidth / names.length
  const maxLabelWidth = Math.max(...names.map(estimateLabelWidth))
  if (maxLabelWidth <= slotWidth) return { rotate: 0, gridBottom: GRID_BOTTOM }

  return {
    rotate: AXIS_LABEL_ROTATE_DEGREE,
    gridBottom: Math.min(
      Math.ceil(maxLabelWidth * Math.SQRT1_2) + AXIS_LABEL_FONT_SIZE + AXIS_LABEL_MARGIN,
      ROTATED_GRID_BOTTOM_MAX,
    ),
  }
}

// 为柱状图和折线图生成共用坐标轴配置；标签角度与底部留白随容器宽度自适应。
function createCartesianOption(chart: ResponseChart, containerWidth: number): ResponseChartOption {
  const isLine = chart.type === 'line'
  const names = chart.data.map((datum) => datum.name)
  const labelLayout = resolveAxisLabelLayout(names, containerWidth)
  return {
    tooltip: {
      ...TOOLTIP_LAYOUT,
      trigger: 'axis',
      axisPointer: isLine ? undefined : { type: 'shadow' },
    },
    grid: { top: 16, right: GRID_RIGHT, bottom: labelLayout.gridBottom, left: GRID_LEFT },
    xAxis: {
      type: 'category',
      boundaryGap: !isLine,
      data: names,
      axisLabel: {
        color: AXIS_LABEL_COLOR,
        interval: 0,
        hideOverlap: true,
        rotate: labelLayout.rotate,
      },
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
// containerWidth 来自实际渲染容器，用于决定类目标签是否倾斜摆放。
export function createResponseChartOption(
  chart: ResponseChart,
  containerWidth: number,
): ResponseChartOption {
  if (chart.type !== 'pie') return createCartesianOption(chart, containerWidth)

  return {
    color: PIE_COLORS,
    tooltip: { ...TOOLTIP_LAYOUT, trigger: 'item', formatter: '{b}：{c}（{d}%）' },
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
