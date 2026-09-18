import { describe, expect, it } from 'vitest'

import type { ResponseChart } from '../../model/types'
import { createResponseChartOption, type ResponseChartOption } from './chartOptions'

const DATA = [
  { name: '医疗险', value: 86 },
  { name: '重疾险', value: 72 },
] as const

function createChart(type: ResponseChart['type']): ResponseChart {
  return { chartId: `chart_${type}`, type, title: `${type} 图`, data: DATA }
}

// 与真实聊天相近的八分类数据，最长标签为 5 个汉字（按 12px 字号约 60px）。
const CROWDED_BAR_CHART: ResponseChart = {
  chartId: 'chart_consultation',
  type: 'bar',
  title: '各险种咨询量',
  data: [
    { name: '百万医疗险', value: 86 },
    { name: '重疾险', value: 64 },
    { name: '意外险', value: 45 },
    { name: '定期寿险', value: 30 },
    { name: '年金险', value: 22 },
    { name: '增额终身寿', value: 18 },
    { name: '惠民保', value: 15 },
    { name: '税优健康险', value: 9 },
  ],
}

// 测试适配：读取单个类目轴的标签角度，本项目配置里只会生成一个 x 轴。
function readAxisLabelRotate(option: ResponseChartOption): number {
  const xAxis = option.xAxis
  const axis = Array.isArray(xAxis) ? xAxis[0] : xAxis
  return axis?.axisLabel?.rotate ?? 0
}

// 测试适配：读取绘图区底部留白，用于断言倾斜标签的空间预留。
function readGridBottom(option: ResponseChartOption): number {
  const grid = option.grid
  const singleGrid = Array.isArray(grid) ? grid[0] : grid
  const bottom = singleGrid?.bottom
  return typeof bottom === 'number' ? bottom : 0
}

describe('createResponseChartOption', () => {
  it.each(['bar', 'line'] as const)('将 %s 数据转换为分类轴单系列', (type) => {
    const option = createResponseChartOption(createChart(type), 320)

    expect(option.xAxis).toMatchObject({ data: ['医疗险', '重疾险'] })
    expect(option.series).toEqual([
      expect.objectContaining({ type, data: [86, 72], name: `${type} 图` }),
    ])
  })

  it('将 pie 数据转换为饼图数据项', () => {
    const option = createResponseChartOption(createChart('pie'), 320)

    expect(option.series).toEqual([
      expect.objectContaining({ type: 'pie', data: DATA, name: 'pie 图' }),
    ])
    expect(option.xAxis).toBeUndefined()
  })

  it('宽容器下标签保持水平并使用默认留白', () => {
    const option = createResponseChartOption(CROWDED_BAR_CHART, 720)

    expect(readAxisLabelRotate(option)).toBe(0)
    expect(readGridBottom(option)).toBe(32)
  })

  it('窄容器下标签改为 45 度倾斜并加大底部留白', () => {
    const option = createResponseChartOption(CROWDED_BAR_CHART, 320)

    expect(readAxisLabelRotate(option)).toBe(45)
    // 60px 标签的竖直投影约 43px，再加字高 12 与轴线间距 8。
    expect(readGridBottom(option)).toBe(63)
  })

  it('折线图与柱状图共用同一套标签自适应规则', () => {
    const lineChart: ResponseChart = { ...CROWDED_BAR_CHART, type: 'line' }

    expect(readAxisLabelRotate(createResponseChartOption(lineChart, 320))).toBe(45)
    expect(readAxisLabelRotate(createResponseChartOption(lineChart, 720))).toBe(0)
  })
})
