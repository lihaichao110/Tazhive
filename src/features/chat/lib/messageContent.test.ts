import { describe, expect, it } from 'vitest'

import { parseAssistantMessageContent } from './messageContent'

describe('parseAssistantMessageContent', () => {
  it('将普通文本保留为文本内容块', () => {
    expect(parseAssistantMessageContent('你好')).toEqual([{ type: 'text', text: '你好' }])
    expect(parseAssistantMessageContent('')).toEqual([])
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
