// @vitest-environment happy-dom

import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  providerInstances: 0,
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
    TypingIndicator: () => <div />,
    useChatSession: () => ({
      error: null,
      isReplying: false,
      messages: [],
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
