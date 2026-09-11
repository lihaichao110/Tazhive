// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useChat } from '../hooks/useChat'

vi.mock('@/shared/config', () => ({
  readDeepSeekConfig: () => ({
    config: { apiKey: 'test', baseUrl: 'https://example.com', modelName: 'test' },
    error: null,
  }),
}))

// 使用真实 Hook 与 SDK，覆盖传输回调到消息列表的完整链路。
describe('请求最终状态与消息去重', () => {
  let chat: ReturnType<typeof useChat>
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  function Harness() {
    chat = useChat()
    return null
  }

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
    await act(async () => root.render(<Harness />))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function send(): Promise<void> {
    await act(async () => {
      chat.send('统计人数', undefined, 'thread')
    })
  }

  it('服务端历史整体替换默认消息，并按角色解析为成功消息', async () => {
    await act(async () => {
      chat.replaceHistory([
        {
          id: 'history-user',
          thread_id: 'thread',
          role: 'user',
          content: '历史提问',
          created_at: '2026-09-11T10:00:00Z',
        },
        {
          id: 'history-assistant',
          thread_id: 'thread',
          role: 'assistant',
          content: '历史回答',
          created_at: '2026-09-11T10:00:01Z',
        },
      ])
    })

    expect(chat.messages).toEqual([
      {
        id: 'history-user',
        role: 'user',
        content: [{ type: 'text', text: '历史提问' }],
        status: 'success',
        quote: undefined,
      },
      {
        id: 'history-assistant',
        role: 'assistant',
        content: [{ type: 'text', text: '历史回答' }],
        status: 'success',
        quote: undefined,
      },
    ])

    await act(async () => {
      chat.clearMessages()
      await vi.advanceTimersByTimeAsync(51)
    })
    expect(chat.messages).toEqual([])
  })

  function deferredResponse() {
    let resolve: (value: Response) => void = () => undefined
    const promise = new Promise<Response>((done) => {
      resolve = done
    })
    return { promise, resolve }
  }

  function success(): Response {
    return new Response('data: {"choices":[{"delta":{"content":"完成"}}]}\n\ndata: [DONE]\n\n', {
      headers: { 'content-type': 'text/event-stream' },
    })
  }

  it('30 秒后仍等待，迟到 500 只生成一个失败气泡，保留后端文案', async () => {
    const response = deferredResponse()
    vi.stubGlobal('fetch', () => response.promise)
    await send()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_001)
    })
    expect(chat.isSlow).toBe(true)
    expect(chat.isReplying).toBe(true)
    expect(chat.messages.filter((message) => message.status === 'error')).toHaveLength(0)
    await act(async () =>
      response.resolve(new Response('{"error":{"message":"后端繁忙"}}', { status: 500 })),
    )
    const errors = chat.messages.filter((message) => message.status === 'error')
    expect(errors).toHaveLength(1)
    expect(JSON.stringify(errors)).toContain('后端繁忙')
    expect(chat.error).toBeNull()
    expect(chat.isSlow).toBe(false)
    expect(chat.isReplying).toBe(false)
  })

  it('等待后成功，不遗留超时错误', async () => {
    const response = deferredResponse()
    vi.stubGlobal('fetch', () => response.promise)
    await send()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })
    await act(async () => response.resolve(success()))
    expect(chat.isReplying).toBe(false)
    expect(chat.isSlow).toBe(false)
    expect(chat.messages.filter((message) => message.status === 'error')).toHaveLength(0)
    expect(JSON.stringify(chat.messages)).toContain('完成')
  })

  it.each([
    [() => Promise.resolve(new Response('bad gateway', { status: 502 })), 'HTTP 502'],
    [() => Promise.reject(new TypeError('network down')), 'network down'],
    [() => Promise.resolve(new Response('{"message":"参数错误"}', { status: 400 })), '参数错误'],
    [() => Promise.resolve(new Response(null, { status: 401 })), '登录状态已失效'],
    [
      () =>
        Promise.resolve(
          new Response('data: {"error":"模型不可用"}\n\n', {
            headers: { 'content-type': 'text/event-stream' },
          }),
        ),
      '模型不可用',
    ],
  ])('失败只展示一次并支持重试：%s', async (fetchResponse, expected) => {
    vi.stubGlobal('fetch', fetchResponse)
    await send()
    const errors = chat.messages.filter((message) => message.status === 'error')
    expect(errors).toHaveLength(1)
    expect(JSON.stringify(errors)).toContain(expected)
    expect(chat.error).toBeNull()
    vi.stubGlobal('fetch', async () => success())
    await act(async () => {
      chat.retry(errors[0]?.id ?? '', 'thread')
    })
    expect(chat.messages.filter((message) => message.status === 'error')).toHaveLength(0)
    expect(JSON.stringify(chat.messages)).toContain('完成')
  })

  it('停止后立即重试，旧请求迟到失败不影响新请求', async () => {
    const old = deferredResponse()
    const next = deferredResponse()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise),
    )
    await send()
    await act(async () => {
      chat.abort()
    })
    expect(chat.isReplying).toBe(false)
    const stopped = chat.messages.find((message) => message.status === 'abort')
    await act(async () => {
      chat.retry(stopped?.id ?? '', 'thread')
    })
    await act(async () => old.resolve(new Response(null, { status: 500 })))
    expect(chat.isReplying).toBe(true)
    expect(chat.messages.filter((message) => message.status === 'error')).toHaveLength(0)
    await act(async () => next.resolve(success()))
    expect(chat.isReplying).toBe(false)
    expect(JSON.stringify(chat.messages)).toContain('完成')
  })

  it('流暂停超过 30 秒后恢复，清除等待提示并完成', async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined
    const encoder = new TextEncoder()
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(value) {
              controller = value
            },
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        ),
    )
    await send()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })
    expect(chat.isSlow).toBe(true)
    await act(async () => {
      controller?.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"完成"}}]}\n\n'))
    })
    expect(chat.isSlow).toBe(false)
    expect(chat.isReplying).toBe(true)
    await act(async () => {
      controller?.close()
    })
    expect(chat.isReplying).toBe(false)
    expect(chat.messages.filter((message) => message.status === 'error')).toHaveLength(0)
  })
})
