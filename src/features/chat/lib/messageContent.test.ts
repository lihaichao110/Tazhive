import { describe, expect, it } from 'vitest'

import { getCopyableAssistantContent, parseAssistantMessageContent } from './messageContent'

describe('getCopyableAssistantContent', () => {
  it('只保留最终回答 Markdown 与 Mermaid 源码', () => {
    expect(
      getCopyableAssistantContent([
        { type: 'thinking', text: '内部分析', completed: true },
        { type: 'text', text: '流程如下：\n' },
        { type: 'mermaid', source: 'flowchart LR\nA --> B' },
        {
          type: 'chart',
          chart: {
            chartId: 'chart-1',
            type: 'bar',
            title: '图表',
            data: [{ name: 'A', value: 1 }],
          },
        },
        { type: 'chart-error', message: '图表加载失败' },
        { type: 'dynamic-card-error', message: '表单加载失败' },
        { type: 'text', text: '\n完成。' },
      ]),
    ).toBe('流程如下：\n```mermaid\nflowchart LR\nA --> B\n```\n完成。')
  })

  it('没有最终文本或 Mermaid 时返回空字符串', () => {
    expect(
      getCopyableAssistantContent([
        { type: 'thinking', text: '内部分析', completed: true },
        { type: 'chart-error', message: '图表加载失败' },
      ]),
    ).toBe('')
  })
})

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

  it.each(['{"content":', '{"content":42,"charts":[]}', '```json\n{"content":\n```'])(
    '无效协议按原始文本显示，避免吞掉后端响应：%s',
    (rawContent) => {
      expect(parseAssistantMessageContent(rawContent)).toEqual([{ type: 'text', text: rawContent }])
    },
  )

  it.each(['', '{"content":'])('流式阶段在正文尚未生成时返回空内容：%s', (rawContent) => {
    expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual([])
  })

  it.each([
    ['普通文本正在生成', '普通文本正在生成'],
    ['{"content":"第一行\\n第二行","charts":[]}', '第一行\n第二行'],
  ])('流式阶段逐步展示正文：%s', (rawContent, expected) => {
    expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual([
      { type: 'text', text: expected },
    ])
  })

  it('从累积的 JSON 分片中持续展示正文', () => {
    const chunks = [
      ['{"content":', ''],
      ['{"content":"第一段', '第一段'],
      ['{"content":"第一段\n第二段', '第一段\n第二段'],
      ['{"content":"第一段\n第二段","charts":[]}', '第一段\n第二段'],
    ]

    chunks.forEach(([rawContent, expected]) => {
      expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual(
        expected ? [{ type: 'text', text: expected }] : [],
      )
    })
  })

  it('流式阶段将 JSON 转义换行还原后再交给 Markdown 渲染', () => {
    const rawContent = '{"content":"# 标题\\n\\n- 第一项\\n- 第二项'

    expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual([
      { type: 'text', text: '# 标题\n\n- 第一项\n- 第二项' },
    ])
  })

  it('流式正文中的转义引号和 charts 文本不会提前结束解析', () => {
    const rawContent = '{"content":"正文含有 \\"charts\\" 文本\\n后文'

    expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual([
      { type: 'text', text: '正文含有 "charts" 文本\n后文' },
    ])
  })

  it('完整信封在流式与完成状态下生成相同正文', () => {
    const rawContent = JSON.stringify({ content: '# 标题\n\n1. 第一项', charts: [] })

    expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual(
      parseAssistantMessageContent(rawContent, 'success'),
    )
  })

  it('兼容 json 围栏内的流式正文', () => {
    expect(parseAssistantMessageContent('```json\n{"content":"围栏正文', 'updating')).toEqual([
      { type: 'text', text: '围栏正文' },
    ])
  })

  it('兼容正文含真实换行的完整响应且不展示 JSON 外壳', () => {
    const rawContent = '{"content":"第一段\n\n**第二段**","charts":[]}'

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'text', text: '第一段\n\n**第二段**' },
    ])
  })

  it('正文含真实换行时仍在结束后渲染图表', () => {
    const rawContent =
      '{"content":"前文\n{{chart:demo}}\n后文","charts":[{"chartId":"demo","type":"bar","title":"演示","data":[{"name":"A","value":1}]}]}'

    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'text', text: '前文\n' },
      expect.objectContaining({
        type: 'chart',
        chart: expect.objectContaining({ chartId: 'demo' }),
      }),
      { type: 'text', text: '\n后文' },
    ])
  })

  it('思考结束后继续流式展示 JSON 正文', () => {
    const rawContent =
      '\n\n<think status="done">\n\n分析完成\n\n</think>\n\n{"content":"正在生成\n第二行'

    expect(parseAssistantMessageContent(rawContent, 'updating')).toEqual([
      { type: 'thinking', text: '分析完成', completed: true },
      { type: 'text', text: '正在生成\n第二行' },
    ])
  })

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
})
