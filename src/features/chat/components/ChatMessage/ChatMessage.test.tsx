import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { XMarkdownProps } from '@ant-design/x-markdown'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { ChatMessage } from './ChatMessage'

vi.mock('@ant-design/x-markdown', () => ({
  XMarkdown: (props: XMarkdownProps) => <div>{props.content}</div>,
}))

describe('ChatMessage', () => {
  it('将引用卡片和问题正文一起展示在用户消息中', () => {
    const markup = renderToStaticMarkup(
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
      </ChatSessionTestProvider>,
    )

    expect(markup).toContain('引用 AI 回答')
    expect(markup).toContain('被引用的回答')
    expect(markup).toContain('为什么？')
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
})
