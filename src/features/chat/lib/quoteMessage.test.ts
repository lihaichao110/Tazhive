import { describe, expect, it } from 'vitest'

import { serializeQuotedPrompt } from './quoteMessage'

describe('serializeQuotedPrompt', () => {
  it('无引用时保持问题原文', () => {
    expect(serializeQuotedPrompt('普通问题')).toBe('普通问题')
  })

  it('将 AI 引用和多行原文转换为 Markdown 引用块', () => {
    expect(
      serializeQuotedPrompt('请继续解释', {
        messageId: 'assistant-1',
        role: 'assistant',
        text: '第一行\n\n第二行',
      }),
    ).toBe('引用（来自AI 回答）：\n\n> 第一行\n> \n> 第二行\n\n我的问题：\n请继续解释')
  })

  it('保留用户引用中的 Markdown 特殊字符', () => {
    expect(
      serializeQuotedPrompt('哪里有问题？', {
        messageId: 'user-1',
        role: 'user',
        text: '**重点** 与 `代码`',
      }),
    ).toContain('引用（来自用户问题）：\n\n> **重点** 与 `代码`')
  })
})
