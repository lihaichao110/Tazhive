// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthInitializationBoundary } from './AuthInitializationBoundary'

const auth = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const state = {
    status: 'unauthenticated' as 'checking' | 'authenticated' | 'unauthenticated' | 'error',
    verificationError: null as string | null,
    retryVerification: vi.fn(),
    isAuthenticated: false,
    isLoggingIn: false,
    error: null as string | null,
    login: vi.fn(async () => undefined),
  }
  return {
    ...state,
    setStatus(status: (typeof state)['status']) {
      this.status = status
      this.isAuthenticated = status === 'authenticated'
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
})

vi.mock('@/features/auth', async () => {
  const { useSyncExternalStore } = await import('react')

  return {
    useAuth: () => {
      useSyncExternalStore(auth.subscribe, () => auth.status)
      return auth
    },
  }
})

let host: HTMLDivElement
let root: Root

describe('AuthInitializationBoundary', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    auth.status = 'unauthenticated'
    auth.verificationError = null
    auth.retryVerification.mockReset()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('校验中不挂载页面，避免业务请求携带未验证凭据', () => {
    act(() => {
      root.render(
        <AuthInitializationBoundary>
          <main data-testid="app-page">页面内容</main>
        </AuthInitializationBoundary>,
      )
      auth.setStatus('checking')
    })

    expect(host.querySelector('[data-testid="app-page"]')).toBeNull()
    expect(host.textContent).toContain('正在验证登录状态')
  })

  it('校验确定后挂载页面', () => {
    act(() => {
      root.render(
        <AuthInitializationBoundary>
          <main data-testid="app-page">页面内容</main>
        </AuthInitializationBoundary>,
      )
      auth.setStatus('checking')
    })
    act(() => auth.setStatus('authenticated'))

    expect(host.querySelector('[data-testid="app-page"]')?.textContent).toContain('页面内容')
  })

  it('校验失败时展示错误与重试入口，不挂载页面', () => {
    act(() => {
      root.render(
        <AuthInitializationBoundary>
          <main data-testid="app-page">页面内容</main>
        </AuthInitializationBoundary>,
      )
      auth.verificationError = '网络连接异常，请检查后重试'
      auth.setStatus('error')
    })

    expect(host.querySelector('[data-testid="app-page"]')).toBeNull()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('暂时无法验证登录状态')
    expect(host.textContent).toContain('网络连接异常，请检查后重试')
  })

  it('重试按钮触发认证重试验证', () => {
    act(() => {
      root.render(
        <AuthInitializationBoundary>
          <main data-testid="app-page">页面内容</main>
        </AuthInitializationBoundary>,
      )
      auth.setStatus('error')
    })
    const retryButton = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === '重新验证',
    )
    act(() => retryButton?.click())

    expect(auth.retryVerification).toHaveBeenCalledOnce()
  })

  it('未登录状态直接展示页面，保持匿名访问能力', () => {
    act(() =>
      root.render(
        <AuthInitializationBoundary>
          <main data-testid="app-page">页面内容</main>
        </AuthInitializationBoundary>,
      ),
    )

    expect(host.querySelector('[data-testid="app-page"]')?.textContent).toContain('页面内容')
  })

  it('卸载时停止订阅认证状态', () => {
    const unsubscribe = vi.fn()
    const subscribeSpy = vi.spyOn(auth, 'subscribe').mockReturnValue(unsubscribe)
    act(() =>
      root.render(
        <AuthInitializationBoundary>
          <main data-testid="app-page">页面内容</main>
        </AuthInitializationBoundary>,
      ),
    )
    act(() => root.unmount())

    expect(subscribeSpy).toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalled()
    subscribeSpy.mockRestore()
  })
})
