// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDeepSeekProvider, ChatUpstreamError } from './deepSeekProvider'

const PROVIDER_CONFIG = {
  apiKey: 'test-key',
  baseUrl: 'https://example.com',
  modelName: 'deepseek-chat',
} as const

// 覆盖后端在 HTTP 200 载荷（SSE data 或 JSON 体）中携带 error 字段的场景：
// SDK 基类会静默丢弃该字段并产生空回复，必须在 Provider 层拦截并转为错误。
describe('上游错误载荷拦截', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('transformMessage 对 SSE error 载荷抛出 ChatUpstreamError，正常增量不受影响', () => {
    const provider = createDeepSeekProvider(PROVIDER_CONFIG, {
      onError: () => undefined,
      onSuccess: () => undefined,
    })
    const headers = new Headers({ 'content-type': 'text/event-stream' })

    expect(() =>
      provider.transformMessage({
        chunk: {
          data: '{"error":"consuming input failed: could not receive data from server: Operation timed out"}',
        },
        chunks: [],
        status: 'updating',
        responseHeaders: headers,
      }),
    ).toThrowError(ChatUpstreamError)

    expect(() =>
      provider.transformMessage({
        chunk: { data: '[DONE]' },
        chunks: [],
        status: 'updating',
        responseHeaders: headers,
      }),
    ).not.toThrow()

    expect(
      provider.transformMessage({
        chunk: { data: '{"choices":[{"delta":{"role":"assistant","content":"你好"}}]}' },
        chunks: [],
        status: 'updating',
        responseHeaders: headers,
      }),
    ).toEqual({ role: 'assistant', content: '你好' })
  })

  it('transformMessage 兼容对象形态的 error 字段', () => {
    const provider = createDeepSeekProvider(PROVIDER_CONFIG, {
      onError: () => undefined,
      onSuccess: () => undefined,
    })
    const headers = new Headers({ 'content-type': 'text/event-stream' })

    expect(() =>
      provider.transformMessage({
        chunk: { data: '{"error":{"message":"model overloaded"}}' },
        chunks: [],
        status: 'updating',
        responseHeaders: headers,
      }),
    ).toThrowError('model overloaded')
  })

  it('SSE 流中的 error 载荷沿 onError 链路抛出上游错误', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          'data: {"error":"consuming input failed: could not receive data from server: Operation timed out"}\n\n',
          { headers: { 'content-type': 'text/event-stream' } },
        ),
    )

    const error = await new Promise<Error>((resolve) => {
      const provider = createDeepSeekProvider(PROVIDER_CONFIG, {
        onError: resolve,
        onSuccess: () => undefined,
      })
      // 模拟 useXChat 的回调注入：transformMessage 抛错会沿 onUpdate 的调用链进入 onError。
      provider.injectRequest({
        onUpdate: (chunk, responseHeaders) =>
          provider.transformMessage({
            chunk,
            status: 'updating',
            chunks: [],
            responseHeaders,
          }),
        onSuccess: () => undefined,
        onError: () => undefined,
      })
      provider.request.run({})
    })

    expect(error).toBeInstanceOf(ChatUpstreamError)
    expect(error.message).toContain('Operation timed out')
  })

  it('JSON 错误体同样沿 onError 链路抛出上游错误', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify({ error: 'upstream unavailable' }), {
          headers: { 'content-type': 'application/json' },
        }),
    )

    const error = await new Promise<Error>((resolve) => {
      const provider = createDeepSeekProvider(PROVIDER_CONFIG, {
        onError: resolve,
        onSuccess: () => undefined,
      })
      provider.injectRequest({
        onUpdate: (chunk, responseHeaders) =>
          provider.transformMessage({
            chunk,
            status: 'updating',
            chunks: [],
            responseHeaders,
          }),
        onSuccess: () => undefined,
        onError: () => undefined,
      })
      provider.request.run({})
    })

    expect(error).toBeInstanceOf(ChatUpstreamError)
    expect(error.message).toBe('upstream unavailable')
  })
})
