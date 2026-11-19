// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useChat } from './useChat'

const { abortRequest, onRequest, providerAbort, sdkMessages, setMessages } = vi.hoisted(() => ({
  abortRequest: vi.fn(),
  onRequest: vi.fn(),
  providerAbort: vi.fn(),
  sdkMessages: [] as Array<Record<string, unknown>>,
  setMessages: vi.fn(),
}))

vi.mock('@ant-design/x-sdk', () => ({
  useXChat: () => ({
    messages: sdkMessages,
    isRequesting: false,
    onRequest,
    setMessages,
    abort: abortRequest,
  }),
}))

vi.mock('../api/deepSeekProvider', () => ({
  createDeepSeekProvider: () => ({ request: { abort: providerAbort } }),
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
    sdkMessages.length = 0
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

  it('重试沿用原用户问题及其引用元数据', () => {
    const quote = { messageId: 'assistant-1', role: 'assistant', text: '原回答重点' }
    const files = [
      {
        object_key: 'chat-images/photo.png',
        file_url: 'https://www.helloimg.com/images/photo.png',
        file_type: 'png',
      },
    ]
    sdkMessages.push(
      {
        id: 'user-1',
        message: { role: 'user', content: '继续解释', quote, files },
        status: 'success',
      },
      { id: 'assistant-1', message: { role: 'assistant', content: '失败回答' }, status: 'error' },
    )

    act(() => controller?.retry('assistant-1', 'thread-1'))

    expect(onRequest).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: '继续解释', quote, requestContent: undefined, files }],
      thinking: { type: 'disabled' },
      thread_id: 'thread-1',
    })
  })

  it('把图片保存在用户消息中以供会话展示', () => {
    const files = [
      {
        object_key: 'chat-images/photo.jpg',
        file_url: 'https://www.helloimg.com/images/photo.jpg',
        file_type: 'jpg',
      },
    ]
    act(() => controller?.send('描述图片', undefined, 'thread-1', files))

    expect(onRequest).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: '描述图片', quote: undefined, files }],
      thinking: { type: 'disabled' },
      thread_id: 'thread-1',
    })
  })

  it('旧历史图片缺少 object_key 时阻止重试并提示重新上传', () => {
    const files = [{ file_url: 'https://images.example.com/legacy.png', file_type: 'png' }]
    sdkMessages.push(
      {
        id: 'legacy-user',
        message: { role: 'user', content: '描述图片', files },
        status: 'success',
      },
      { id: 'failed-answer', message: { role: 'assistant', content: '失败回答' }, status: 'error' },
    )

    act(() => controller?.retry('failed-answer', 'thread-1'))

    expect(onRequest).not.toHaveBeenCalled()
    expect(setMessages).not.toHaveBeenCalled()
    expect(controller?.error).toBe('历史图片缺少有效上传标识，请重新上传图片后再试。')
  })

  it('恢复历史消息时保留图片字段以供展示和重试判断', () => {
    const files = [
      {
        object_key: 'chat-images/new.png',
        file_url: 'https://images.example.com/new.png',
        file_type: 'png',
      },
      { file_url: 'https://images.example.com/legacy.png', file_type: 'png' },
    ]

    act(() =>
      controller?.replaceHistory([
        {
          id: 'user-history',
          thread_id: 'thread-1',
          role: 'user',
          content: '描述图片',
          references: [],
          files,
          created_at: '2026-11-18T00:00:00Z',
        },
      ]),
    )

    expect(setMessages).toHaveBeenCalledWith([
      {
        id: 'user-history',
        message: { role: 'user', content: '描述图片', references: [], files },
        status: 'success',
      },
    ])
  })
})
