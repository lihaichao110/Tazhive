// @vitest-environment happy-dom

import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  providerInstances: 0,
  isReplying: false,
  isSlow: false,
  messages: [] as ReturnType<typeof import('@/features/chat').useChatSession>['messages'],
  clearError: vi.fn(),
}))

const auth = vi.hoisted(() => {
  const listeners = new Set<() => void>()

  return {
    isAuthenticated: false,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    notify: (): void => listeners.forEach((listener) => listener()),
  }
})

vi.mock('./components/ChatHeader/ChatHeader', () => ({
  ChatHeader: () => <div />,
}))

vi.mock('./components/ChatSidebar/ChatSidebar', () => ({
  ChatSidebar: () => <div />,
}))

vi.mock('@/features/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/chat')>()
  return {
    ...actual,
    ChatComposer: () => <div />,
    ChatMessage: () => <div />,
    ChatSessionProvider: ({ children }: { children: ReactNode }) => {
      const [instance] = useState(() => {
        testState.providerInstances += 1
        return testState.providerInstances
      })
      return <div data-provider-instance={instance}>{children}</div>
    },
    DynamicCardHostProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    TypingIndicator: () => <div role="status" aria-label="AI 正在输入" />,
    useChatSession: () => ({
      error: null,
      isReplying: testState.isReplying,
      isSlow: testState.isSlow,
      messages: testState.messages,
      clearError: testState.clearError,
    }),
  }
})

vi.mock('@/features/auth', async () => {
  const { useSyncExternalStore } = await import('react')

  return {
    useAuth: () => {
      useSyncExternalStore(auth.subscribe, () => auth.isAuthenticated)
      return auth
    },
  }
})

import { HomePage } from './HomePage'

import { ConversationStoreProvider, createConversationStore } from '@/features/chat'

let host: HTMLDivElement
let root: Root

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    testState.isSlow = false
    testState.isReplying = false
    testState.messages = []
    testState.providerInstances = 0
    testState.clearError.mockClear()
    auth.isAuthenticated = false
    auth.notify()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it.each([true, false])('慢响应等待状态 %s 不作为错误横幅展示', (isWaiting) => {
    const store = createConversationStore()
    testState.isReplying = isWaiting
    testState.isSlow = isWaiting
    act(() =>
      root.render(
        <ConversationStoreProvider store={store}>
          <HomePage />
        </ConversationStoreProvider>,
      ),
    )
    expect(host.textContent?.includes('响应较慢，请稍候')).toBe(isWaiting)
    expect(host.querySelector('[aria-label="AI 正在输入"]')).toBeNull()
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it.each(['loading', 'updating'] as const)('%s 消息已有正文时不叠加输入动画', (status) => {
    testState.isReplying = true
    testState.messages = [
      {
        id: 'reply',
        role: 'assistant',
        status,
        content: [{ type: 'text', text: '正在返回的正文' }],
      },
    ]
    act(() => {
      root.render(
        <ConversationStoreProvider store={createConversationStore()}>
          <HomePage />
        </ConversationStoreProvider>,
      )
    })

    expect(host.querySelector('[aria-label="AI 正在输入"]')).toBeNull()
  })

  it.each([true, false])('只有请求中且没有消息反馈时显示输入动画：%s', (isReplying) => {
    testState.isReplying = isReplying
    // 历史回答不能阻止新请求在空占位阶段显示反馈。
    testState.messages = [
      {
        id: 'history',
        role: 'assistant',
        status: 'success',
        content: [{ type: 'text', text: '历史回答' }],
      },
      { id: 'reply', role: 'assistant', status: 'loading', content: [] },
    ]
    act(() => {
      root.render(
        <ConversationStoreProvider store={createConversationStore()}>
          <HomePage />
        </ConversationStoreProvider>,
      )
    })

    expect(Boolean(host.querySelector('[aria-label="AI 正在输入"]'))).toBe(isReplying)
  })

  it('会话重置版本变化后重建聊天 Provider', () => {
    const store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <HomePage />
        </ConversationStoreProvider>,
      )
    })
    expect(
      host.querySelector('[data-provider-instance]')?.getAttribute('data-provider-instance'),
    ).toBe('1')

    act(() => store.getState().startNewConversation())

    expect(
      host.querySelector('[data-provider-instance]')?.getAttribute('data-provider-instance'),
    ).toBe('2')
  })

  it('登录成功后清除遗留的登录失效提示', () => {
    const store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <HomePage />
        </ConversationStoreProvider>,
      )
    })

    auth.isAuthenticated = true
    act(() => {
      auth.notify()
    })

    expect(testState.clearError).toHaveBeenCalledOnce()
  })

  it('初次恢复已登录状态时不清除错误', () => {
    const store = createConversationStore()
    auth.isAuthenticated = true
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <HomePage />
        </ConversationStoreProvider>,
      )
    })

    expect(testState.clearError).not.toHaveBeenCalled()
  })
})
