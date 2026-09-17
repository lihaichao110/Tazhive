import { afterEach, describe, expect, it, vi } from 'vitest'

import { verifySession } from './verifySession'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, createHttpClient: () => ({ get }) }
})

describe('verifySession', () => {
  afterEach(() => get.mockReset())

  it('携带取消信号请求认证校验接口并接受 204', async () => {
    get.mockResolvedValue({ status: 204, data: '' })
    const controller = new AbortController()

    await expect(verifySession(controller.signal)).resolves.toBeUndefined()
    expect(get).toHaveBeenCalledWith('/api/v1/auth/verify', {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    })
  })

  it('拒绝非 204 的异常成功响应', async () => {
    get.mockResolvedValue({ status: 200, data: '' })

    await expect(verifySession(new AbortController().signal)).rejects.toMatchObject({
      name: 'HttpError',
      message: '登录状态校验响应异常，请稍后重试',
    })
  })

  it('透传请求失败供调用方区分网络错误与认证失效', async () => {
    const failure = new Error('网络连接异常，请检查后重试')
    get.mockRejectedValue(failure)

    await expect(verifySession(new AbortController().signal)).rejects.toBe(failure)
  })
})
