import { describe, expect, it } from 'vitest'

import { createInsuranceMockReply } from '../model/insuranceCard'
import { parseAssistantMessageContent } from './messageContent'

describe('parseAssistantMessageContent', () => {
  it('将普通文本保留为文本内容块', () => {
    expect(parseAssistantMessageContent('你好')).toEqual([{ type: 'text', text: '你好' }])
    expect(parseAssistantMessageContent('')).toEqual([])
  })

  it('将图表 JSON 按正文标记组合为有序内容块', () => {
    const rawContent = JSON.stringify({
      content: '前文{{chart:chart_bar}}中间{{chart:chart_pie}}后文',
      charts: [
        {
          chartId: 'chart_bar',
          type: 'bar',
          title: '咨询量',
          data: [{ name: '医疗险', value: 86 }],
        },
        {
          chartId: 'chart_pie',
          type: 'pie',
          title: '咨询占比',
          data: [{ name: '医疗险', value: 60 }],
        },
      ],
    })

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'text', text: '前文' },
      expect.objectContaining({ type: 'chart', chart: expect.objectContaining({ type: 'bar' }) }),
      { type: 'text', text: '中间' },
      expect.objectContaining({ type: 'chart', chart: expect.objectContaining({ type: 'pie' }) }),
      { type: 'text', text: '后文' },
    ])
  })

  it('兼容单层 json 围栏并忽略未引用图表', () => {
    const envelope = JSON.stringify({
      content: '只有正文',
      charts: [
        {
          chartId: 'unused',
          type: 'line',
          title: '未引用',
          data: [{ name: '一月', value: 1 }],
        },
      ],
    })

    expect(parseAssistantMessageContent(`\`\`\`json\n${envelope}\n\`\`\``)).toEqual([
      { type: 'text', text: '只有正文' },
    ])
  })

  it('同一图表标记可重复引用', () => {
    const rawContent = JSON.stringify({
      content: '{{chart:same}}再次展示{{chart:same}}',
      charts: [
        { chartId: 'same', type: 'line', title: '趋势', data: [{ name: '一月', value: 1 }] },
      ],
    })

    expect(parseAssistantMessageContent(rawContent).map((block) => block.type)).toEqual([
      'chart',
      'text',
      'chart',
    ])
  })

  it.each([
    {
      charts: [{ chartId: 'bad', type: 'scatter', title: '未知', data: [{ name: 'A', value: 1 }] }],
    },
    {
      charts: [{ chartId: 'bad', type: 'bar', title: '字符串', data: [{ name: 'A', value: '1' }] }],
    },
    { charts: [{ chartId: 'bad', type: 'bar', title: '', data: [{ name: 'A', value: 1 }] }] },
    { charts: [{ chartId: 'bad', type: 'bar', title: '空数据', data: [] }] },
    {
      charts: [
        { chartId: 'bad', type: 'bar', title: '重复一', data: [{ name: 'A', value: 1 }] },
        { chartId: 'bad', type: 'bar', title: '重复二', data: [{ name: 'B', value: 2 }] },
      ],
    },
  ])('非法或重复图表在引用位置局部降级', ({ charts }) => {
    const rawContent = JSON.stringify({ content: '前{{chart:bad}}后', charts })

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'text', text: '前' },
      { type: 'chart-error', message: '图表数据暂不可用。' },
      { type: 'text', text: '后' },
    ])
  })

  it('缺失图表引用局部降级', () => {
    const rawContent = JSON.stringify({ content: '{{chart:missing}}', charts: [] })

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'chart-error', message: '图表数据暂不可用。' },
    ])
  })

  it.each(['{"content":', '{"content":"正文"}', '```json\n{broken}\n```'])(
    '明显属于协议但无效时隐藏原始内容：%s',
    (rawContent) => {
      expect(parseAssistantMessageContent(rawContent)).toEqual([
        { type: 'chart-error', message: '回答格式异常，请重试。' },
      ])
    },
  )

  it.each(['', '{"content":', '{"content":"完整但状态未结束","charts":[]}'])(
    '流式阶段不暴露协议内容：%s',
    (rawContent) => {
      expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual([
        { type: 'protocol-loading' },
      ])
    },
  )

  it('将未闭合的 think 协议段解析为正在思考的内容块', () => {
    const rawContent = '\n\n<think>\n\n先分析问题，再寻找答案'

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'thinking', text: '先分析问题，再寻找答案', completed: false },
    ])
  })

  it('将已完成的思考和最终回答按顺序拆分', () => {
    const rawContent =
      '\n\n<think status="done">\n\n分析完成\n\n</think>\n\n结论如下：\n```mermaid\ngraph LR\nA-->B\n```'

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'thinking', text: '分析完成', completed: true },
      { type: 'text', text: '结论如下：\n' },
      { type: 'mermaid', source: 'graph LR\nA-->B' },
    ])
  })

  it('不将普通回答中间的 think 标签误判为协议段', () => {
    const rawContent = '代码示例：`<think>内容</think>`'

    expect(parseAssistantMessageContent(rawContent)).toEqual([{ type: 'text', text: rawContent }])
  })

  it('按原始顺序拆分文本和 Mermaid 围栏', () => {
    const rawContent = '流程如下：\n```mermaid\nflowchart LR\nA --> B\n```\n完成。'

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'text', text: '流程如下：\n' },
      { type: 'mermaid', source: 'flowchart LR\nA --> B' },
      { type: 'text', text: '\n完成。' },
    ])
  })

  it('支持多个 Mermaid 围栏和 CRLF 换行', () => {
    const rawContent =
      '```mermaid\r\ngraph TD\r\nA-->B\r\n```中间```MERMAID\nsequenceDiagram\nA->>B: Hi\n```'

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'mermaid', source: 'graph TD\r\nA-->B' },
      { type: 'text', text: '中间' },
      { type: 'mermaid', source: 'sequenceDiagram\nA->>B: Hi' },
    ])
  })

  it('将未闭合的 Mermaid 围栏保留为文本', () => {
    const rawContent = '```mermaid\nflowchart LR\nA --> B'

    expect(parseAssistantMessageContent(rawContent)).toEqual([{ type: 'text', text: rawContent }])
  })

  it('将空 Mermaid 围栏保留为文本，同时继续解析后续有效围栏', () => {
    const emptyFence = '```mermaid\n  \n```'
    const rawContent = `${emptyFence}\n\`\`\`mermaid\ngraph LR\nA-->B\n\`\`\``

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'text', text: `${emptyFence}\n` },
      { type: 'mermaid', source: 'graph LR\nA-->B' },
    ])
  })

  it('将合法的 A2UI v0.9 围栏解析为动态卡片', () => {
    const content = parseAssistantMessageContent(createInsuranceMockReply('insurance-test'))

    expect(content).toHaveLength(1)
    expect(content[0]).toMatchObject({
      type: 'dynamic-card',
      surfaceId: 'insurance-test',
      commands: expect.arrayContaining([expect.objectContaining({ version: 'v0.9' })]),
    })
  })

  it.each([
    '```a2ui\n{broken}\n```',
    '```a2ui\n{"surfaceId":"bad","commands":[{"version":"v0.8"}]}\n```',
    '```a2ui\n{"surfaceId":"bad","commands":[{"version":"v0.9","updateComponents":{"surfaceId":"bad","components":[{"id":"root","component":"Script"}]}}]}\n```',
  ])('非法或越权的 A2UI 数据安全降级', (rawContent) => {
    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'dynamic-card-error', message: '表单暂时无法加载，请稍后重试。' },
    ])
  })
})
