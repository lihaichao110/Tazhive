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

const { chatMocks, requestCreateThread, requestInsuranceAction, requestListThreadMessages } =
  vi.hoisted(() => ({
    chatMocks: {
      abort: vi.fn(),
      clearMessages: vi.fn(),
      clearError: vi.fn(),
      replaceHistory: vi.fn(),
      retry: vi.fn(),
      send: vi.fn(),
      setMode: vi.fn(),
      submitCardAction: vi.fn(),
      upsertHistoryMessages: vi.fn(),
    },
    requestCreateThread: vi.fn(),
    requestInsuranceAction: vi.fn(),
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
vi.mock('../api/submitInsuranceAction', () => ({ requestInsuranceAction }))

// 只暴露历史加载用例需要的动作与状态，其余会话行为由主测试文件覆盖。
function HistorySessionHarness() {
  const session = useChatSession()
  return (
    <div>
      <span data-busy>{String(session.isReplying)}</span>
      <span data-history-loading>{String(session.isHistoryLoading)}</span>
      <span data-history-error>{session.historyError ?? '无历史错误'}</span>
      <button type="button" onClick={() => void session.sendMessage('继续解释')}>
        发送
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
    </div>
  )
}

function click(host: HTMLElement, label: string): void {
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent === label)
  if (!button) throw new Error(`未找到测试按钮：${label}`)
  act(() => button.click())
}

describe('ChatSessionProvider 历史消息加载', () => {
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
            <HistorySessionHarness />
          </ChatSessionProvider>
        </ConversationStoreProvider>,
      )
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('挂载时未选中会话则不拉取历史', () => {
    expect(requestListThreadMessages).not.toHaveBeenCalled()
  })

  it('挂载时若全局已选中会话，自动拉取历史恢复消息列表', async () => {
    // beforeEach 已用未选中的 store 渲染，先卸载再用选中态模拟路由返回后的重新挂载。
    act(() => root.unmount())
    const history = [
      {
        id: 'message-1',
        thread_id: 'existing-thread',
        role: 'user',
        content: '历史提问',
        created_at: '2026-09-11T10:00:00Z',
      },
    ]
    requestListThreadMessages.mockResolvedValue(history)
    act(() => {
      store.getState().adoptConversation('existing-thread', '既有会话')
    })
    host = document.createElement('div')
    root = createRoot(host)
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatSessionProvider>
            <HistorySessionHarness />
          </ChatSessionProvider>
        </ConversationStoreProvider>,
      )
    })
    await act(async () => {})

    expect(requestListThreadMessages).toHaveBeenCalledWith('existing-thread')
    expect(chatMocks.replaceHistory).toHaveBeenCalledWith(history)
    expect(host.querySelector('[data-history-loading]')?.textContent).toBe('false')
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
