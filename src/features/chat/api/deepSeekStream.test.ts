// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeepSeekChatProvider, XRequest, XStream, type SSEOutput } from '@ant-design/x-sdk'

import {
  createDeepSeekProvider,
  type DeepSeekMessage,
  type DeepSeekRequestParams,
} from './deepSeekProvider'

import { registerAccessTokenProvider, registerAccessTokenRejectedHandler } from '@/shared/api'

const cleanups: Array<() => void> = []

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

// 按指定字节位置切分响应，模拟中文字符和 SSE 事件跨网络分片到达的情况。
function createByteStream(
  bytes: Uint8Array,
  splitPoints: readonly number[],
): ReadableStream<Uint8Array> {
  const chunks = splitPoints.map((start, index) =>
    bytes.slice(start, splitPoints[index + 1] ?? bytes.length),
  )

  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk))
      controller.close()
    },
  })
}

describe('DeepSeek SSE 流', () => {
  it('能够跨字节边界解析中文增量和 DONE 事件', async () => {
    const body = [
      'data: {"choices":[{"delta":{"role":"assistant","content":"你"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"好"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n')
    const bytes = new TextEncoder().encode(body)
    const chunks: SSEOutput[] = []

    for await (const chunk of XStream({
      readableStream: createByteStream(bytes, [0, 7, 63, 64, bytes.length - 3]),
    })) {
      chunks.push(chunk)
    }

    expect(chunks.map((chunk) => chunk.data)).toEqual([
      '{"choices":[{"delta":{"role":"assistant","content":"你"}}]}',
      '{"choices":[{"delta":{"content":"好"}}]}',
      '[DONE]',
    ])
  })

  it('Provider 将多个增量合并到同一条回答', () => {
    const request = XRequest<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>(
      'https://example.com',
      {
        manual: true,
      },
    )
    const provider = new DeepSeekChatProvider<DeepSeekMessage, DeepSeekRequestParams, SSEOutput>({
      request,
    })
    const headers = new Headers({ 'content-type': 'text/event-stream' })
    const first = provider.transformMessage({
      chunk: { data: '{"choices":[{"delta":{"role":"assistant","content":"你"}}]}' },
      chunks: [],
      status: 'updating',
      responseHeaders: headers,
    })
    const second = provider.transformMessage({
      originMessage: first,
      chunk: { data: '{"choices":[{"delta":{"content":"好"}}]}' },
      chunks: [],
      status: 'updating',
      responseHeaders: headers,
    })

    expect(second).toEqual({ role: 'assistant', content: '你好' })
  })

  it('请求前序列化引用并移除界面元数据', () => {
    const provider = createDeepSeekProvider(
      { apiKey: 'test-key', baseUrl: 'https://example.com', modelName: 'deepseek-chat' },
      { onError: () => undefined, onSuccess: () => undefined },
    )
    provider.injectGetMessages(() => [
      {
        role: 'user',
        content: '请展开说明',
        quote: { messageId: 'assistant-1', role: 'assistant', text: '关键结论' },
      },
    ])

    const params = provider.transformParams({}, provider.request.options)

    expect(params.messages).toEqual([
      {
        role: 'user',
        content: '引用（来自AI 回答）：\n\n> 关键结论\n\n我的问题：\n请展开说明',
      },
    ])
    expect(params.messages?.[0]).not.toHaveProperty('quote')
  })

  it('HTTP 错误通过 onError 返回', async () => {
    const error = await new Promise<Error>((resolve) => {
      const request = XRequest('https://example.com', {
        manual: true,
        fetch: async () => new Response('unauthorized', { status: 401 }),
        callbacks: {
          onError: resolve,
          onSuccess: () => undefined,
        },
      })
      request.run({})
    })

    expect(error.message).toContain('401')
  })

  it('聊天请求动态携带当前登录令牌', async () => {
    let accessToken: string | null = 'access-token'
    cleanups.push(registerAccessTokenProvider(() => accessToken))
    let authorization: string | null = null
    vi.stubGlobal('fetch', async (_input: RequestInfo | URL, options?: RequestInit) => {
      authorization = new Headers(options?.headers).get('Authorization')
      return new Response('data: [DONE]\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      })
    })
    const provider = createDeepSeekProvider(
      { apiKey: 'test-key', baseUrl: 'https://example.com', modelName: 'deepseek-chat' },
      { onError: () => undefined, onSuccess: () => undefined },
    )
    accessToken = 'renewed-token'
    provider.request.run({})
    await provider.request.asyncHandler

    expect(authorization).toBe('Bearer renewed-token')
  })

  it('聊天请求收到 401 后上报被拒令牌并返回正确提示', async () => {
    const rejectedTokens: string[] = []
    cleanups.push(registerAccessTokenProvider(() => 'expired-token'))
    cleanups.push(
      registerAccessTokenRejectedHandler((accessToken) => rejectedTokens.push(accessToken)),
    )
    vi.stubGlobal('fetch', async () => new Response(undefined, { status: 401 }))

    const error = await new Promise<Error>((resolve) => {
      const provider = createDeepSeekProvider(
        { apiKey: 'test-key', baseUrl: 'https://example.com', modelName: 'deepseek-chat' },
        { onError: resolve, onSuccess: () => undefined },
      )
      provider.request.run({})
    })

    expect(rejectedTokens).toEqual(['expired-token'])
    expect(error).toMatchObject({
      name: 'HttpError',
      message: '登录状态已失效，请重新登录',
      status: 401,
    })
  })

  it('取消请求返回 AbortError', async () => {
    const error = await new Promise<Error>((resolve) => {
      const request = XRequest('https://example.com', {
        manual: true,
        fetch: async (_url, options) =>
          new Promise<Response>((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => reject(options.signal?.reason))
          }),
        callbacks: {
          onError: resolve,
          onSuccess: () => undefined,
        },
      })
      request.run({})
      request.abort()
    })

    expect(error.name).toBe('AbortError')
  })
})
