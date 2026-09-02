import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestLogin } from './login'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, createHttpClient: () => ({ post }) }
})

describe('requestLogin', () => {
  beforeEach(() => post.mockReset())

  it('使用固定账号请求登录接口并返回整理后的令牌', async () => {
    post.mockResolvedValue({
      data: { access_token: '  access-token  ', token_type: 'bearer' },
    })

    await expect(requestLogin()).resolves.toEqual({
      access_token: 'access-token',
      token_type: 'bearer',
    })
    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', {
      username: 'lihaichao',
      password: 'lihaichao',
    })
  })

  it('拒绝缺少有效访问令牌的响应', async () => {
    post.mockResolvedValue({ data: { access_token: '  ', token_type: 'bearer' } })

    await expect(requestLogin()).rejects.toMatchObject({
      name: 'HttpError',
      message: '登录响应缺少有效访问令牌',
    })
  })
})
