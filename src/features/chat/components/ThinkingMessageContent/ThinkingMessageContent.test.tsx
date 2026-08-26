import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ThinkProps } from '@ant-design/x'
import type { XMarkdownProps } from '@ant-design/x-markdown'

import { ThinkingMessageContent } from './ThinkingMessageContent'

const { markdownCalls, thinkCalls } = vi.hoisted(() => ({
  markdownCalls: [] as XMarkdownProps[],
  thinkCalls: [] as ThinkProps[],
}))

vi.mock('@ant-design/x', () => ({
  Think: (props: ThinkProps) => {
    thinkCalls.push(props)
    return <div data-title={props.title}>{props.children}</div>
  },
}))

vi.mock('@ant-design/x-markdown', () => ({
  XMarkdown: (props: XMarkdownProps) => {
    markdownCalls.push(props)
    return <div>{props.content}</div>
  },
}))

describe('ThinkingMessageContent', () => {
  beforeEach(() => {
    markdownCalls.length = 0
    thinkCalls.length = 0
  })

  it.each(['loading', 'updating'] as const)('状态为 %s 时展示正在思考并默认展开', (status) => {
    renderToStaticMarkup(<ThinkingMessageContent text="分析中" completed={false} status={status} />)

    expect(thinkCalls[0]).toMatchObject({
      title: '正在思考',
      loading: true,
      expanded: true,
    })
    expect(markdownCalls[0]?.streaming).toEqual({ hasNextChunk: true })
    expect(markdownCalls[0]).toMatchObject({
      components: expect.objectContaining({
        code: expect.any(Function),
        pre: expect.any(Function),
      }),
      disableDefaultStyles: ['pre', 'code'],
    })
  })

  it('协议段闭合后展示已思考并默认收起', () => {
    renderToStaticMarkup(<ThinkingMessageContent text="分析完成" completed status="updating" />)

    expect(thinkCalls[0]).toMatchObject({
      title: '已思考',
      loading: false,
      expanded: false,
    })
    expect(markdownCalls[0]?.streaming).toEqual({ hasNextChunk: false })
  })

  it.each(['success', 'error', 'abort'] as const)('消息状态为 %s 时统一展示已思考', (status) => {
    renderToStaticMarkup(
      <ThinkingMessageContent text="已有分析" completed={false} status={status} />,
    )

    expect(thinkCalls[0]).toMatchObject({
      title: '已思考',
      loading: false,
      expanded: false,
    })
  })
})
