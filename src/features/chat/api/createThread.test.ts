import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestCreateThread } from './createThread'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/shared/api', () => ({ createHttpClient: () => ({ post }) }))

describe('requestCreateThread', () => {
  beforeEach(() => post.mockReset())

  it('携带会话标题请求创建接口', async () => {
    post.mockResolvedValue({ data: undefined })

    await expect(requestCreateThread('新项目讨论')).resolves.toBeUndefined()
    expect(post).toHaveBeenCalledWith('/api/v1/threads', { title: '新项目讨论' })
  })
})
