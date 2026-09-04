// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatHeader } from './ChatHeader'

import { ConversationStoreProvider, createConversationStore } from '@/features/chat'

const { abort, auth, requestCreateThread } = vi.hoisted(() => ({
  abort: vi.fn(),
  auth: {
    error: null as string | null,
    isAuthenticated: false,
    isLoggingIn: false,
    login: vi.fn(async () => undefined),
  },
  requestCreateThread: vi.fn(async () => undefined),
}))

vi.mock('@/features/auth', () => ({ useAuth: () => auth }))

vi.mock('@/features/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/chat')>()
  return {
    ...actual,
    requestCreateThread,
    useChatSession: () => ({ abort }),
  }
})

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

vi.mock('./NewConversationModal', () => ({
  NewConversationModal: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean
    onConfirm: (title: string) => void | Promise<void>
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() => void Promise.resolve(onConfirm('  新项目讨论  ')).catch(() => undefined)}
      >
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
    requestCreateThread.mockReset()
    requestCreateThread.mockResolvedValue(undefined)
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

  it('服务端创建会话成功后终止旧回复并同步 Store 标题', async () => {
    const store = createConversationStore(() => 'new-conversation')
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    act(() => host.querySelector<HTMLButtonElement>('[aria-label="新建对话"]')?.click())
    await act(async () => {
      ;[...host.querySelectorAll('button')]
        .find((button) => button.textContent === '确认创建')
        ?.click()
    })

    expect(requestCreateThread).toHaveBeenCalledWith('  新项目讨论  ')
    expect(abort).toHaveBeenCalledOnce()
    expect(store.getState().sessionVersion).toBe(1)
    expect(host.textContent).toContain('新项目讨论')
  })

  it('服务端创建会话失败时保留弹窗且不更新本地会话', async () => {
    const store = createConversationStore(() => 'new-conversation')
    requestCreateThread.mockRejectedValueOnce(new Error('创建失败'))
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatHeader />
        </ConversationStoreProvider>,
      )
    })

    act(() => host.querySelector<HTMLButtonElement>('[aria-label="新建对话"]')?.click())
    await act(async () => {
      ;[...host.querySelectorAll('button')]
        .find((button) => button.textContent === '确认创建')
        ?.click()
      await Promise.resolve()
    })

    expect(abort).not.toHaveBeenCalled()
    expect(store.getState().sessionVersion).toBe(0)
    expect(host.textContent).toContain('确认创建')
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
