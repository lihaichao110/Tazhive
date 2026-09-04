// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatHeader } from './ChatHeader'

import { ConversationStoreProvider, createConversationStore } from '@/features/chat'

const auth = vi.hoisted(() => ({
  error: null as string | null,
  isAuthenticated: false,
  isLoggingIn: false,
  login: vi.fn(async () => undefined),
}))

vi.mock('@/features/auth', () => ({ useAuth: () => auth }))

vi.mock('./LoginDrawer', () => ({
  LoginDrawer: ({
    isOpen,
    onLogin,
  }: {
    isOpen: boolean
    onLogin: (credentials: { username: string; password: string }) => Promise<void>
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="账号登录">
        <button
          type="button"
          onClick={() => void onLogin({ username: 'lihaichao', password: 'lihaichao' })}
        >
          提交登录
        </button>
      </div>
    ) : null,
}))

let host: HTMLDivElement
let root: Root

describe('ChatHeader', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
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

  it('首次使用无会话时标题展示兜底文案并切换侧边栏', () => {
    const store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    expect(host.textContent).toContain('新对话')
    const sidebarButton = host.querySelector<HTMLButtonElement>('[aria-label="切换侧边栏"]')
    expect(sidebarButton?.getAttribute('aria-expanded')).toBe('false')
    act(() => sidebarButton?.click())
    expect(sidebarButton?.getAttribute('aria-expanded')).toBe('true')
  })

  it('选中会话后标题随 Store 更新', () => {
    const store = createConversationStore()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    act(() => store.getState().adoptConversation('server-thread', '服务端会话'))

    expect(host.textContent).toContain('服务端会话')
  })

  it('点击登录按钮打开抽屉并通过表单调用认证能力', () => {
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

    expect(host.querySelector('[role="dialog"][aria-label="账号登录"]')).not.toBeNull()
    act(() => {
      ;[...host.querySelectorAll('button')]
        .find((button) => button.textContent === '提交登录')
        ?.click()
    })

    expect(auth.login).toHaveBeenCalledWith({ username: 'lihaichao', password: 'lihaichao' })
  })

  it('登录成功后关闭抽屉并展示登录头像', () => {
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
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()

    auth.isAuthenticated = true
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('当前账号已登录')
    expect(
      [...host.querySelectorAll('button')].some((button) => button.textContent === '登录'),
    ).toBe(false)
  })
})
