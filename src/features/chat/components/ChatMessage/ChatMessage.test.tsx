import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { XProvider } from '@ant-design/x'
import type { XMarkdownProps } from '@ant-design/x-markdown'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { ChatMessage } from './ChatMessage'

vi.mock('@ant-design/x-markdown', () => ({
  XMarkdown: (props: XMarkdownProps) => <div>{props.content}</div>,
}))

describe('ChatMessage', () => {
  it('将引用卡片和问题正文一起展示在用户消息中', () => {
    const markup = renderToStaticMarkup(
      <XProvider theme={{ token: { colorPrimary: '#028550' } }}>
        <ChatSessionTestProvider>
          <ChatMessage
            message={{
              id: 'user-2',
              role: 'user',
              content: [{ type: 'text', text: '为什么？' }],
              quote: { messageId: 'assistant-1', role: 'assistant', text: '被引用的回答' },
              status: 'local',
            }}
          />
        </ChatSessionTestProvider>
      </XProvider>,
    )

    expect(markup).toContain('引用 AI 回答')
    expect(markup).toContain('被引用的回答')
    expect(markup).toContain('为什么？')
    expect(markup).toContain('ant-bubble-end')
    expect(markup).toContain('ant-bubble-content-filled')
    expect(markup).toContain('background-color:#028550')
  })

  it('普通用户消息不渲染引用卡片', () => {
    const markup = renderToStaticMarkup(
      <ChatSessionTestProvider>
        <ChatMessage
          message={{
            id: 'user-1',
            role: 'user',
            content: [{ type: 'text', text: '普通问题' }],
            status: 'local',
          }}
        />
      </ChatSessionTestProvider>,
    )

    expect(markup).toContain('普通问题')
    expect(markup).not.toContain('引用你的问题')
  })

  it('成功的 AI 回答使用无背景气泡并在左侧底部显示复制按钮', () => {
    const markup = renderToStaticMarkup(
      <ChatSessionTestProvider>
        <ChatMessage
          message={{
            id: 'assistant-1',
            role: 'assistant',
            content: [{ type: 'text', text: '最终回答' }],
            status: 'success',
          }}
        />
      </ChatSessionTestProvider>,
    )

    expect(markup).toContain('ant-bubble-start')
    expect(markup).toContain('ant-bubble-content-borderless')
    expect(markup).toContain('ant-bubble-footer-start')
    expect(markup).toContain('aria-label="复制回答"')
  })

  it.each(['loading', 'updating', 'error', 'abort'] as const)(
    '%s 状态的 AI 消息不显示整条回答复制按钮',
    (status) => {
      const message = {
        id: `assistant-${status}`,
        role: 'assistant',
        content: [{ type: 'text', text: '回答' }],
        status,
      } as const
      const markup = renderToStaticMarkup(
        <ChatSessionTestProvider value={{ messages: [message] }}>
          <ChatMessage message={message} />
        </ChatSessionTestProvider>,
      )

      expect(markup).not.toContain('aria-label="复制回答"')
      if (status === 'error') expect(markup).toContain('重试')
    },
  )

  it('成功但没有可复制正文的 AI 消息不显示复制按钮', () => {
    const markup = renderToStaticMarkup(
      <ChatSessionTestProvider>
        <ChatMessage
          message={{
            id: 'assistant-chart-error',
            role: 'assistant',
            content: [{ type: 'chart-error', message: '图表加载失败' }],
            status: 'success',
          }}
        />
      </ChatSessionTestProvider>,
    )

    expect(markup).not.toContain('aria-label="复制回答"')
  })
})
