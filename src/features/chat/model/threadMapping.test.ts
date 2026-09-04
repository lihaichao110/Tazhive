import { describe, expect, it } from 'vitest'

import { mapThreadsToConversations } from './threadMapping'
import type { ThreadRead } from '../api/listThreads'

function createThread(overrides: Partial<ThreadRead> = {}): ThreadRead {
  return {
    created_at: '2026-09-01T10:00:00Z',
    id: 'thread-1',
    status: 'active',
    title: '产品路线图讨论',
    updated_at: '2026-09-02T10:00:00Z',
    user_id: 'user-1',
    ...overrides,
  }
}

describe('mapThreadsToConversations', () => {
  it('映射服务端字段并保留标题', () => {
    const [conversation] = mapThreadsToConversations([createThread()])

    expect(conversation?.id).toBe('thread-1')
    expect(conversation?.title).toBe('产品路线图讨论')
    expect(conversation?.preview).toBe('暂无消息')
    expect(conversation?.updatedAt).not.toBe('')
  })

  it('标题为 null 时使用兜底文案', () => {
    const [conversation] = mapThreadsToConversations([createThread({ title: null })])

    expect(conversation?.title).toBe('新对话')
  })

  it('无效时间回退为空串', () => {
    const [conversation] = mapThreadsToConversations([createThread({ updated_at: 'not-a-date' })])

    expect(conversation?.updatedAt).toBe('')
  })
})
