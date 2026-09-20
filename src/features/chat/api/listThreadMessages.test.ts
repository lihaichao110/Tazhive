import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestListThreadMessages } from './listThreadMessages'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/shared/api', () => ({ createHttpClient: () => ({ get }) }))

describe('requestListThreadMessages', () => {
  beforeEach(() => get.mockReset())

  it('使用编码后的线程 ID 发起 GET，并保持消息顺序', async () => {
    const messages = [
      {
        id: 'message-1',
        thread_id: 'thread/1',
        role: 'user',
        content: '你好',
        created_at: '2026-09-11T10:00:00Z',
      },
      {
        id: 'message-2',
        thread_id: 'thread/1',
        role: 'assistant',
        content: '你好，有什么可以帮你？',
        references: [
          {
            source_type: 'rag',
            title: '员工手册',
            url: '',
            snippet: '请假制度',
            document_id: 'doc-1',
            chunk_index: 3,
          },
          { source_type: 'unknown' },
        ],
        created_at: '2026-09-11T10:00:01Z',
      },
    ]
    get.mockResolvedValue({ data: messages })

    await expect(requestListThreadMessages('thread/1')).resolves.toEqual([
      { ...messages[0], references: [] },
      {
        ...messages[1],
        references: [
          {
            source_type: 'rag',
            title: '员工手册',
            url: '',
            snippet: '请假制度',
            document_id: 'doc-1',
            chunk_index: 3,
          },
        ],
      },
    ])
    expect(get).toHaveBeenCalledWith('/api/v1/threads/thread%2F1/messages')
  })

  it('references 缺失时归一化为空数组，非数组字段则拒绝响应', async () => {
    const message = {
      id: 'message-1',
      thread_id: 'thread-1',
      role: 'assistant',
      content: '历史回答',
      created_at: '2026-09-11T10:00:01Z',
    }
    get.mockResolvedValueOnce({ data: [message] })
    await expect(requestListThreadMessages('thread-1')).resolves.toEqual([
      { ...message, references: [] },
    ])

    get.mockResolvedValueOnce({ data: [{ ...message, references: {} }] })
    await expect(requestListThreadMessages('thread-1')).rejects.toThrow('历史消息响应格式不正确')
  })

  it.each([
    {},
    [{ id: 'message-1', thread_id: 'thread-1', role: 'system', content: '', created_at: '' }],
    [{ id: 'message-1', thread_id: 'thread-1', role: 'user', created_at: '' }],
  ])('拒绝非法响应：%j', async (data) => {
    get.mockResolvedValue({ data })

    await expect(requestListThreadMessages('thread-1')).rejects.toThrow('历史消息响应格式不正确')
  })
})
