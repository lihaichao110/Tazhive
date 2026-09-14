// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useChat } from './useChat'

const { abortRequest, onRequest, providerAbort, setMessages } = vi.hoisted(() => ({
  abortRequest: vi.fn(),
  onRequest: vi.fn(),
  providerAbort: vi.fn(),
  setMessages: vi.fn(),
}))

vi.mock('@ant-design/x-sdk', () => ({
  useXChat: () => ({
    messages: [],
    isRequesting: false,
    onRequest,
    setMessages,
    abort: abortRequest,
  }),
}))

vi.mock('../api/deepSeekProvider', () => ({
  createDeepSeekProvider: () => ({ request: { abort: providerAbort } }),
}))

vi.mock('@/shared/config', () => ({
  readDeepSeekConfig: () => ({
    config: { apiKey: 'test', baseUrl: 'https://example.com', modelName: 'model' },
    error: null,
  }),
}))

type ChatController = ReturnType<typeof useChat>
let controller: ChatController | null = null

function Harness() {
  controller = useChat()
  return null
}

describe('useChat', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
    act(() => root.render(<Harness />))
  })

  afterEach(() => {
    act(() => root.unmount())
    controller = null
    vi.unstubAllGlobals()
  })

  it('包含投保关键词的消息仍请求大模型', () => {
    let accepted = false
    act(() => {
      accepted = controller?.send('我想买保险', undefined, 'thread-1') ?? false
    })

    expect(accepted).toBe(true)
    expect(onRequest).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: '我想买保险', quote: undefined }],
      thinking: { type: 'disabled' },
      thread_id: 'thread-1',
    })
  })

  it('卡片动作显示摘要并携带结构化请求正文', () => {
    act(() => {
      controller?.submitCardAction(
        {
          name: 'plan_apply',
          surfaceId: 'plans-1',
          context: { group_name: '安享一生', group_code: 'G0264' },
        },
        'thread-1',
      )
    })

    expect(onRequest).toHaveBeenCalledWith({
      messages: [
        {
          role: 'user',
          content: '已选择「安享一生」正式投保',
          requestContent:
            '{"type":"a2ui_action","name":"plan_apply","surfaceId":"plans-1","context":{"group_name":"安享一生","group_code":"G0264"}}',
        },
      ],
      thinking: { type: 'disabled' },
      thread_id: 'thread-1',
    })
  })
})
