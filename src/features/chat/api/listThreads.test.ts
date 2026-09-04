import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestListThreads } from './listThreads'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/shared/api', () => ({ createHttpClient: () => ({ get }) }))

describe('requestListThreads', () => {
  beforeEach(() => get.mockReset())

  it('请求会话列表接口并返回数据', async () => {
    const threads = [
      {
        created_at: '2026-09-01T10:00:00Z',
        id: 'thread-1',
        status: 'active',
        title: '产品路线图讨论',
        updated_at: '2026-09-02T10:00:00Z',
        user_id: 'user-1',
      },
    ]
    get.mockResolvedValue({ data: threads })

    await expect(requestListThreads()).resolves.toEqual(threads)
    expect(get).toHaveBeenCalledWith('/api/v1/threads')
  })

  it('响应不是合法列表时抛出格式错误', async () => {
    get.mockResolvedValue({ data: { id: 'thread-1' } })

    await expect(requestListThreads()).rejects.toThrow('会话列表响应格式不正确')
  })
})
