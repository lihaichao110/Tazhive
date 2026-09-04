import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestCreateThread } from './createThread'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/shared/api', () => ({ createHttpClient: () => ({ post }) }))

describe('requestCreateThread', () => {
  beforeEach(() => post.mockReset())

  it('携带会话标题请求创建接口并返回新线程 ID', async () => {
    post.mockResolvedValue({ data: { id: 'thread-1', title: '新项目讨论' } })

    await expect(requestCreateThread('新项目讨论')).resolves.toBe('thread-1')
    expect(post).toHaveBeenCalledWith('/api/v1/threads', { title: '新项目讨论' })
  })

  it('响应缺少线程 ID 时抛出格式错误', async () => {
    post.mockResolvedValue({ data: { title: '新项目讨论' } })

    await expect(requestCreateThread('新项目讨论')).rejects.toThrow('创建会话响应格式不正确')
  })
})
