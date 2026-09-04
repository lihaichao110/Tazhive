// @vitest-environment happy-dom

import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({ providerInstances: 0 }))

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
    useChatSession: () => ({ error: null, isReplying: false, messages: [] }),
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
})
