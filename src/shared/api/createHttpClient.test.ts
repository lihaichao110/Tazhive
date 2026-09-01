import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { registerAccessTokenProvider } from './accessToken'
import { createHttpClient } from './createHttpClient'
import { HttpError } from './httpError'

const cleanups: Array<() => void> = []

function createSuccessAdapter(visit?: (config: InternalAxiosRequestConfig) => void): AxiosAdapter {
  return async (config) => {
    visit?.(config)
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }
}

function createErrorAdapter(status?: number, data?: unknown, code?: string): AxiosAdapter {
  return async (config) => {
    const response = status ? { data, status, statusText: 'Error', headers: {}, config } : undefined
    throw new AxiosError('request failed', code, config, undefined, response)
  }
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
})

describe('createHttpClient', () => {
  it('应用基础地址、超时和 JSON 响应配置', () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com', timeout: 120_000 })

    expect(client.defaults.baseURL).toBe('https://api.example.com')
    expect(client.defaults.timeout).toBe(120_000)
    expect(client.defaults.responseType).toBe('json')
  })

  it('每次请求动态读取最新 Bearer token', async () => {
    let token: string | null = null
    cleanups.push(registerAccessTokenProvider(() => token))
    const authorizations: unknown[] = []
    const client = createHttpClient()
    const adapter = createSuccessAdapter((config) => {
      authorizations.push(config.headers.get('Authorization'))
    })

    await client.get('/anonymous', { adapter })
    token = 'first-token'
    await client.get('/signed-in', { adapter })
    token = 'renewed-token'
    await client.get('/renewed', { adapter })
    token = null
    await client.get('/signed-out', { adapter })

    expect(authorizations).toEqual([
      undefined,
      'Bearer first-token',
      'Bearer renewed-token',
      undefined,
    ])
  })

  it('优先使用后端 message 并保留状态码', async () => {
    const client = createHttpClient()
    const promise = client.get('/documents', {
      adapter: createErrorAdapter(422, { message: '文档内容无法解析' }),
    })

    await expect(promise).rejects.toMatchObject({
      name: 'HttpError',
      message: '文档内容无法解析',
      status: 422,
    })
  })

  it('归一化未授权、普通 HTTP、网络和超时错误', async () => {
    const client = createHttpClient()
    const cases = [
      [createErrorAdapter(401), '登录状态已失效，请重新登录'],
      [createErrorAdapter(500), '请求失败（HTTP 500）'],
      [createErrorAdapter(), '网络连接异常，请检查后重试'],
      [createErrorAdapter(undefined, undefined, 'ECONNABORTED'), '请求超时，请稍后重试'],
    ] as const

    await Promise.all(
      cases.map(async ([adapter, message]) => {
        await expect(client.get('/failure', { adapter })).rejects.toMatchObject({
          name: 'HttpError',
          message,
        })
      }),
    )
  })

  it('不吞掉非 Axios 错误', async () => {
    const client = createHttpClient()
    const originalError = new Error('adapter crashed')
    const adapter: AxiosAdapter = async () => {
      throw originalError
    }

    await expect(client.get('/failure', { adapter })).rejects.toBe(originalError)
    expect(originalError).not.toBeInstanceOf(HttpError)
  })
})
