// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatHeader } from './ChatHeader'

import { ConversationStoreProvider, createConversationStore } from '@/features/chat'

const { abort, auth } = vi.hoisted(() => ({
  abort: vi.fn(),
  auth: {
    error: null as string | null,
    isAuthenticated: false,
    isLoggingIn: false,
    login: vi.fn(async () => undefined),
  },
}))

vi.mock('@/features/auth', () => ({ useAuth: () => auth }))

vi.mock('@/features/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/chat')>()
  return {
    ...actual,
    useChatSession: () => ({ abort }),
  }
})

vi.mock('./NewConversationModal', () => ({
  NewConversationModal: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean
    onConfirm: (title: string) => void
  }) =>
    isOpen ? (
      <button type="button" onClick={() => onConfirm('  新项目讨论  ')}>
        确认创建
      </button>
    ) : null,
}))

let host: HTMLDivElement
let root: Root

describe('ChatHeader', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    abort.mockClear()
    auth.error = null
    auth.isAuthenticated = false
    auth.isLoggingIn = false
    auth.login.mockClear()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('直接读取 Store 标题并切换侧边栏', () => {
    const store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    expect(host.textContent).toContain('产品路线图讨论')
    const sidebarButton = host.querySelector<HTMLButtonElement>('[aria-label="切换侧边栏"]')
    expect(sidebarButton?.getAttribute('aria-expanded')).toBe('false')
    act(() => sidebarButton?.click())
    expect(sidebarButton?.getAttribute('aria-expanded')).toBe('true')
  })

  it('创建会话前终止旧回复并同步 Store 标题', () => {
    const store = createConversationStore(() => 'new-conversation')
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    act(() => host.querySelector<HTMLButtonElement>('[aria-label="新建对话"]')?.click())
    act(() => {
      ;[...host.querySelectorAll('button')]
        .find((button) => button.textContent === '确认创建')
        ?.click()
    })

    expect(abort).toHaveBeenCalledOnce()
    expect(store.getState().sessionVersion).toBe(1)
    expect(host.textContent).toContain('新项目讨论')
  })

  it('点击登录按钮时调用认证能力', () => {
    const store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    act(() => {
      ;[...host.querySelectorAll('button')].find((button) => button.textContent === '登录')?.click()
    })

    expect(auth.login).toHaveBeenCalledOnce()
  })

  it('展示登录中、已登录和失败状态', () => {
    const store = createConversationStore()
    auth.isLoggingIn = true
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    expect(host.textContent).toContain('登录中…')
    expect(
      [...host.querySelectorAll('button')].find((button) => button.textContent === '登录中…')
        ?.disabled,
    ).toBe(true)

    auth.isLoggingIn = false
    auth.isAuthenticated = true
    auth.error = '上一次错误'
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    expect(host.textContent).toContain('已登录')
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('上一次错误')
  })
})
