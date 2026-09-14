// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatSessionProvider } from './ChatSessionProvider'
import { useChatSession } from './useChatSession'

import {
  ConversationStoreProvider,
  createConversationStore,
  type ConversationStoreApi,
} from '@/features/chat'

const { chatMocks, requestCreateThread, requestListThreadMessages } = vi.hoisted(() => ({
  chatMocks: {
    abort: vi.fn(),
    clearMessages: vi.fn(),
    clearError: vi.fn(),
    replaceHistory: vi.fn(),
    retry: vi.fn(),
    send: vi.fn(),
    setMode: vi.fn(),
    submitCardAction: vi.fn(),
  },
  requestCreateThread: vi.fn(),
  requestListThreadMessages: vi.fn(),
}))

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    isReplying: false,
    error: null,
    mode: 'fast',
    ...chatMocks,
  }),
}))

vi.mock('../api/createThread', () => ({ requestCreateThread }))
vi.mock('../api/listThreadMessages', () => ({ requestListThreadMessages }))

const QUOTE = { messageId: 'assistant-1', role: 'assistant', text: '被引用内容' } as const
const CARD_ACTION = {
  name: 'plan_apply',
  surfaceId: 'plans-1',
  context: { group_code: 'G0264', group_name: '安享一生' },
} as const
const FIRST_MESSAGE = '这是一段很长很长的首条消息内容需要被截断成短标题'

function SessionHarness() {
  const session = useChatSession()
  return (
    <div>
      <span data-quote>{session.quote?.text ?? '无引用'}</span>
      <span data-error>{session.error ?? '无错误'}</span>
      <span data-busy>{String(session.isReplying)}</span>
      <span data-history-loading>{String(session.isHistoryLoading)}</span>
      <span data-history-error>{session.historyError ?? '无历史错误'}</span>
      <button type="button" onClick={() => session.selectQuote(QUOTE)}>
        选择引用
      </button>
      <button type="button" onClick={session.clearQuote}>
        清除引用
      </button>
      <button type="button" onClick={session.clearError}>
        清除错误
      </button>
      <button type="button" onClick={() => void session.sendMessage('继续解释')}>
        发送
      </button>
      <button type="button" onClick={() => void session.sendMessage(FIRST_MESSAGE)}>
        首次发送
      </button>
      <button type="button" onClick={() => session.retry('failed-answer')}>
        重试
      </button>
      <button type="button" onClick={() => void session.loadHistory('history-thread')}>
        加载历史
      </button>
      <button type="button" onClick={() => void session.loadHistory('newer-thread')}>
        加载新历史
      </button>
      <button type="button" onClick={() => void session.retryHistory()}>
        重试历史
      </button>
      <button type="button" onClick={() => session.submitCardAction(CARD_ACTION)}>
        提交卡片动作
      </button>
    </div>
  )
}

function click(host: HTMLElement, label: string): void {
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent === label)
  if (!button) throw new Error(`未找到测试按钮：${label}`)
  act(() => button.click())
}

describe('ChatSessionProvider', () => {
  let host: HTMLDivElement
  let root: Root
  let store: ConversationStoreApi

  beforeEach(() => {
    vi.clearAllMocks()
    requestCreateThread.mockResolvedValue('server-thread-1')
    requestListThreadMessages.mockResolvedValue([])
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
    store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatSessionProvider>
            <SessionHarness />
          </ChatSessionProvider>
        </ConversationStoreProvider>,
      )
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('支持选择和主动清除引用', () => {
    click(host, '选择引用')
    expect(host.querySelector('[data-quote]')?.textContent).toBe('被引用内容')

    click(host, '清除引用')
    expect(host.querySelector('[data-quote]')?.textContent).toBe('无引用')
  })

  it('新会话首次发送前用首条消息创建线程，并用新线程 ID 请求大模型', async () => {
    chatMocks.send.mockReturnValue(true)
    click(host, '首次发送')
    await act(async () => {})

    expect(requestCreateThread).toHaveBeenCalledOnce()
    expect(requestCreateThread.mock.calls[0]?.[0]).toHaveLength(21)
    expect(requestCreateThread.mock.calls[0]?.[0].endsWith('…')).toBe(true)
    expect(chatMocks.send).toHaveBeenCalledWith(FIRST_MESSAGE, undefined, 'server-thread-1')
    expect(store.getState().selectedConversationId).toBe('server-thread-1')
    // 绑定当前会话不重建聊天 Provider，sessionVersion 保持不变。
    expect(store.getState().sessionVersion).toBe(0)
    expect(host.querySelector('[data-error]')?.textContent).toBe('无错误')
  })

  it('建线程等待期间对外呈现回复中的加载状态', async () => {
    let resolveCreate: (threadId: string) => void = () => undefined
    requestCreateThread.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCreate = resolve
      }),
    )
    click(host, '发送')

    // 建线程请求进行中：发送按钮应处于 loading，避免界面看似卡住。
    expect(host.querySelector('[data-busy]')?.textContent).toBe('true')
    expect(chatMocks.send).not.toHaveBeenCalled()

    await act(async () => resolveCreate('server-thread-1'))
    expect(host.querySelector('[data-busy]')?.textContent).toBe('false')
  })

  it('已绑定会话时复用线程 ID 直接发送，不再重复建线程', async () => {
    chatMocks.send.mockReturnValue(true)
    store.getState().adoptConversation('existing-thread', '既有会话')
    click(host, '发送')
    await act(async () => {})

    expect(requestCreateThread).not.toHaveBeenCalled()
    expect(chatMocks.send).toHaveBeenCalledWith('继续解释', undefined, 'existing-thread')
  })

  it('建线程失败时拒绝发送并暴露错误', async () => {
    chatMocks.send.mockReturnValue(true)
    requestCreateThread.mockRejectedValue(new Error('网络连接异常，请检查后重试'))
    click(host, '发送')
    await act(async () => {})

    expect(chatMocks.send).not.toHaveBeenCalled()
    expect(host.querySelector('[data-error]')?.textContent).toContain('网络连接异常')
  })

  it('登录恢复后清除建会话遗留错误', async () => {
    requestCreateThread.mockRejectedValue(new Error('会话令牌无效'))
    click(host, '发送')
    await act(async () => {})
    expect(host.querySelector('[data-error]')?.textContent).toBe('会话令牌无效')

    click(host, '清除错误')

    expect(chatMocks.clearError).toHaveBeenCalledOnce()
    expect(host.querySelector('[data-error]')?.textContent).toBe('无错误')
  })

  it('发送成功后清除引用并把引用写入发送参数', async () => {
    chatMocks.send.mockReturnValue(true)
    store.getState().adoptConversation('existing-thread', '既有会话')
    click(host, '选择引用')
    click(host, '发送')
    await act(async () => {})

    expect(chatMocks.send).toHaveBeenCalledWith('继续解释', QUOTE, 'existing-thread')
    expect(host.querySelector('[data-quote]')?.textContent).toBe('无引用')
  })

  it('发送被拒绝时保留引用供用户重试', async () => {
    chatMocks.send.mockReturnValue(false)
    store.getState().adoptConversation('existing-thread', '既有会话')
    click(host, '选择引用')
    click(host, '发送')
    await act(async () => {})

    expect(host.querySelector('[data-quote]')?.textContent).toBe('被引用内容')
  })

  it('重试时携带当前会话的线程 ID', async () => {
    store.getState().adoptConversation('existing-thread', '既有会话')
    click(host, '重试')

    expect(chatMocks.retry).toHaveBeenCalledWith('failed-answer', 'existing-thread')
  })

  it('将卡片动作连同当前线程 ID 交给会话控制 Hook', () => {
    store.getState().adoptConversation('existing-thread', '既有会话')
    click(host, '提交卡片动作')
    expect(chatMocks.submitCardAction).toHaveBeenCalledWith(CARD_ACTION, 'existing-thread')
  })

  it('加载历史时终止回复、清空旧消息并替换为服务端消息', async () => {
    const history = [
      {
        id: 'message-1',
        thread_id: 'history-thread',
        role: 'user',
        content: '历史提问',
        created_at: '2026-09-11T10:00:00Z',
      },
    ]
    requestListThreadMessages.mockResolvedValue(history)

    click(host, '加载历史')
    expect(host.querySelector('[data-history-loading]')?.textContent).toBe('true')
    expect(host.querySelector('[data-busy]')?.textContent).toBe('true')
    expect(chatMocks.abort).toHaveBeenCalledOnce()
    expect(chatMocks.clearMessages).toHaveBeenCalledOnce()
    click(host, '发送')
    expect(requestCreateThread).not.toHaveBeenCalled()
    expect(chatMocks.send).not.toHaveBeenCalled()
    await act(async () => {})

    expect(requestListThreadMessages).toHaveBeenCalledWith('history-thread')
    expect(chatMocks.replaceHistory).toHaveBeenCalledWith(history)
    expect(host.querySelector('[data-history-loading]')?.textContent).toBe('false')
  })

  it('历史加载失败后显示错误，并可重试相同线程', async () => {
    requestListThreadMessages.mockRejectedValueOnce(new Error('历史接口不可用'))

    click(host, '加载历史')
    await act(async () => {})
    expect(host.querySelector('[data-history-error]')?.textContent).toBe('历史接口不可用')

    requestListThreadMessages.mockResolvedValueOnce([])
    click(host, '重试历史')
    await act(async () => {})
    expect(requestListThreadMessages).toHaveBeenLastCalledWith('history-thread')
    expect(chatMocks.replaceHistory).toHaveBeenLastCalledWith([])
  })

  it('忽略晚于新会话返回的过期历史响应', async () => {
    let resolveOld: (value: readonly never[]) => void = () => undefined
    requestListThreadMessages
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce([])

    click(host, '加载历史')
    click(host, '加载新历史')
    await act(async () => {})
    expect(chatMocks.replaceHistory).toHaveBeenCalledTimes(1)

    await act(async () => resolveOld([]))
    expect(chatMocks.replaceHistory).toHaveBeenCalledTimes(1)
  })

  it('切换历史会话后忽略迟到的建线程结果', async () => {
    let resolveCreate: (threadId: string) => void = () => undefined
    requestCreateThread.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCreate = resolve
      }),
    )
    click(host, '发送')
    expect(host.querySelector('[data-busy]')?.textContent).toBe('true')

    act(() => {
      store
        .getState()
        .setConversations([
          { id: 'newer-thread', title: '历史会话', preview: '暂无消息', updatedAt: '刚刚' },
        ])
      store.getState().selectConversation('newer-thread')
    })
    click(host, '加载新历史')
    await act(async () => {})
    await act(async () => resolveCreate('late-created-thread'))

    expect(store.getState().selectedConversationId).toBe('newer-thread')
    expect(chatMocks.send).not.toHaveBeenCalled()
  })
})
