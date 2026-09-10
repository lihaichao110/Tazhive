import { describe, expect, it } from 'vitest'

import type { ResponseChart } from '../../model/types'
import { createResponseChartOption } from './chartOptions'

const DATA = [
  { name: '医疗险', value: 86 },
  { name: '重疾险', value: 72 },
] as const

function createChart(type: ResponseChart['type']): ResponseChart {
  return { chartId: `chart_${type}`, type, title: `${type} 图`, data: DATA }
}

describe('createResponseChartOption', () => {
  it.each(['bar', 'line'] as const)('将 %s 数据转换为分类轴单系列', (type) => {
    const option = createResponseChartOption(createChart(type))

    expect(option.xAxis).toMatchObject({ data: ['医疗险', '重疾险'] })
    expect(option.series).toEqual([
      expect.objectContaining({ type, data: [86, 72], name: `${type} 图` }),
    ])
  })

  it('将 pie 数据转换为饼图数据项', () => {
    const option = createResponseChartOption(createChart('pie'))

    expect(option.series).toEqual([
      expect.objectContaining({ type: 'pie', data: DATA, name: 'pie 图' }),
    ])
  })
})
