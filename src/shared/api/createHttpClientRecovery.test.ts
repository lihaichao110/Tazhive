import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import {
  registerAccessTokenProvider,
  registerAccessTokenRejectedHandler,
  registerAccessTokenRefresher,
} from './accessToken'
import { createHttpClient } from './createHttpClient'

const cleanups: Array<() => void> = []

// 顺序返回预设状态的适配器：用于验证“401 → 刷新 → 重试”的多次请求编排。
function createSequentialAdapter(
  routes: readonly number[],
  visit?: (config: InternalAxiosRequestConfig) => void,
): AxiosAdapter {
  let callCount = 0
  return async (config) => {
    visit?.(config)
    const status = routes[Math.min(callCount, routes.length - 1)] ?? 200
    callCount += 1
    if (status === 200) {
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    throw new AxiosError('request failed', undefined, config, undefined, {
      data: {},
      status,
      statusText: 'Error',
      headers: {},
      config,
    })
  }
}

interface SessionStub {
  readonly refreshCount: () => number
  readonly rejectedTokens: string[]
}

// 注册可编程会话：刷新成功后当前令牌切换为刷新后令牌，并记录拒绝上报。
function setupSession(initialToken: string, refreshedToken: string): SessionStub {
  let refreshed = false
  let refreshCount = 0
  const rejectedTokens: string[] = []
  cleanups.push(
    registerAccessTokenProvider(() => (refreshed ? refreshedToken : initialToken)),
    registerAccessTokenRefresher(async () => {
      refreshCount += 1
      refreshed = true
      return true
    }),
    registerAccessTokenRejectedHandler((rejectedToken) => {
      rejectedTokens.push(rejectedToken)
    }),
  )
  return { refreshCount: () => refreshCount, rejectedTokens }
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
})

describe('createHttpClient 401 静默恢复', () => {
  it('401 后静默刷新并以新令牌重试原请求', async () => {
    setupSession('old-token', 'new-token')
    const authorizations: unknown[] = []
    const client = createHttpClient()
    const adapter = createSequentialAdapter([401, 200], (config) => {
      authorizations.push(config.headers.get('Authorization'))
    })

    const response = await client.get('/protected', { adapter })

    expect(response.status).toBe(200)
    expect(authorizations).toEqual(['Bearer old-token', 'Bearer new-token'])
  })

  it('并发 401 只触发一次刷新，各自重试后全部成功', async () => {
    const session = setupSession('old-token', 'new-token')
    const client = createHttpClient()
    const adapter = createSequentialAdapter([401, 401, 200, 200])

    const [first, second] = await Promise.all([
      client.get('/first', { adapter }),
      client.get('/second', { adapter }),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(session.refreshCount()).toBe(1)
  })

  it('刷新失败时上报被拒令牌并以 401 错误终结', async () => {
    const currentToken = { value: 'old-token' }
    const rejectedTokens: string[] = []
    cleanups.push(
      registerAccessTokenProvider(() => currentToken.value),
      registerAccessTokenRefresher(async () => false),
      registerAccessTokenRejectedHandler((rejectedToken) => {
        rejectedTokens.push(rejectedToken)
      }),
    )
    const client = createHttpClient()

    await expect(
      client.get('/protected', { adapter: createSequentialAdapter([401]) }),
    ).rejects.toMatchObject({
      name: 'HttpError',
      message: '登录状态已失效，请重新登录',
      status: 401,
    })

    expect(rejectedTokens).toEqual(['old-token'])
  })

  it('刷新后重试仍被 401 拒绝时不再重试，直接判定会话失效', async () => {
    const session = setupSession('old-token', 'new-token')
    const client = createHttpClient()
    const adapter = createSequentialAdapter([401, 401])

    await expect(client.get('/protected', { adapter })).rejects.toMatchObject({ status: 401 })

    expect(session.refreshCount()).toBe(1)
    expect(session.rejectedTokens).toEqual(['new-token'])
  })

  it('authentication 关闭时不注入令牌，401 也不触发刷新与拒绝上报', async () => {
    const currentToken = { value: 'old-token' }
    const authorizations: unknown[] = []
    const rejectedTokens: string[] = []
    cleanups.push(
      registerAccessTokenProvider(() => currentToken.value),
      registerAccessTokenRefresher(async () => {
        currentToken.value = 'new-token'
        return true
      }),
      registerAccessTokenRejectedHandler((rejectedToken) => {
        rejectedTokens.push(rejectedToken)
      }),
    )
    const client = createHttpClient({ authentication: false })
    const adapter = createSequentialAdapter([401], (config) => {
      authorizations.push(config.headers.get('Authorization'))
    })

    await expect(
      client.post('/api/v1/auth/refresh', { refresh_token: 'r' }, { adapter }),
    ).rejects.toMatchObject({ status: 401 })

    expect(authorizations).toEqual([undefined])
    expect(rejectedTokens).toHaveLength(0)
  })
})
