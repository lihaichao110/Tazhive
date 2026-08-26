import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ThinkProps } from '@ant-design/x'
import type { XMarkdownProps } from '@ant-design/x-markdown'

import { ChatMessageContent } from './ChatMessageContent'

const { markdownCalls } = vi.hoisted(() => ({
  markdownCalls: [] as XMarkdownProps[],
}))

vi.mock('@ant-design/x-markdown', () => ({
  XMarkdown: (props: XMarkdownProps) => {
    markdownCalls.push(props)
    return <div data-markdown-content={props.content}>{props.content}</div>
  },
}))

vi.mock('@ant-design/x', () => ({
  Think: (props: ThinkProps) => <div data-title={props.title}>{props.children}</div>,
}))

describe('ChatMessageContent', () => {
  beforeEach(() => {
    markdownCalls.length = 0
  })

  it('使用安全配置渲染助手 Markdown', () => {
    renderToStaticMarkup(
      <ChatMessageContent
        content={[{ type: 'text', text: '# 标题' }]}
        role="assistant"
        status="success"
      />,
    )

    expect(markdownCalls).toHaveLength(1)
    expect(markdownCalls[0]).toMatchObject({
      components: expect.objectContaining({
        code: expect.any(Function),
        pre: expect.any(Function),
      }),
      content: '# 标题',
      disableDefaultStyles: ['pre', 'code'],
      escapeRawHtml: true,
      openLinksInNewTab: true,
      streaming: { hasNextChunk: false },
    })
  })

  it('将用户消息保留为纯文本', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageContent
        content={[{ type: 'text', text: '**用户文本**' }]}
        role="user"
        status="success"
      />,
    )

    expect(markdownCalls).toHaveLength(0)
    expect(markup).toContain('**用户文本**')
    expect(markup).not.toContain('<strong>')
  })

  it('保持文本与 Mermaid 内容块的原始顺序', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageContent
        content={[
          { type: 'text', text: '前文' },
          { type: 'mermaid', source: 'graph LR\nA-->B' },
          { type: 'text', text: '后文' },
        ]}
        role="assistant"
        status="success"
      />,
    )

    expect(markup.indexOf('前文')).toBeLessThan(markup.indexOf('图表组件加载中'))
    expect(markup.indexOf('图表组件加载中')).toBeLessThan(markup.indexOf('后文'))
  })

  it('将思考内容交给 Think 展示且不混入普通 Markdown', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageContent
        content={[
          { type: 'thinking', text: '内部分析', completed: true },
          { type: 'text', text: '最终回答' },
        ]}
        role="assistant"
        status="success"
      />,
    )

    expect(markup).toContain('已思考')
    expect(markdownCalls.map((call) => call.content)).toEqual(['内部分析', '最终回答'])
  })

  it.each(['loading', 'updating'] as const)('状态为 %s 时流式渲染最后一个文本块', (status) => {
    renderToStaticMarkup(
      <ChatMessageContent
        content={[
          { type: 'text', text: '已完成内容' },
          { type: 'text', text: '生成中' },
        ]}
        role="assistant"
        status={status}
      />,
    )

    expect(markdownCalls.map((call) => call.streaming)).toEqual([
      { hasNextChunk: false },
      { hasNextChunk: true },
    ])
  })

  it.each(['success', 'error', 'abort'] as const)('状态为 %s 时结束流式渲染', (status) => {
    renderToStaticMarkup(
      <ChatMessageContent
        content={[{ type: 'text', text: '最终内容' }]}
        role="assistant"
        status={status}
      />,
    )

    expect(markdownCalls[0]?.streaming).toEqual({ hasNextChunk: false })
  })
})
