// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AxiosError, type AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

import { createHttpClient, reportAccessTokenRejected } from '@/shared/api'

const { requestLogin, verifySession } = vi.hoisted(() => ({
  requestLogin: vi.fn(),
  verifySession: vi.fn(),
}))

vi.mock('../api/login', () => ({ requestLogin }))
vi.mock('../api/verifySession', () => ({ verifySession }))

// 暴露 Provider 状态，测试登录动作、启动校验与统一请求鉴权的完整衔接。
function AuthProbe() {
  const auth = useAuth()
  return (
    <div>
      <button
        type="button"
        disabled={auth.isLoggingIn}
        onClick={() => void auth.login({ username: 'test-user', password: 'test-password' })}
      >
        {auth.isAuthenticated
          ? '已登录'
          : auth.status === 'checking'
            ? '校验中'
            : auth.status === 'error'
              ? '校验失败'
              : '登录'}
      </button>
      {auth.status === 'error' ? (
        <button type="button" onClick={auth.retryVerification}>
          重新验证
        </button>
      ) : null}
      {auth.error ? <span role="alert">{auth.error}</span> : null}
    </div>
  )
}

let host: HTMLDivElement
let root: Root

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    window.localStorage.clear()
    requestLogin.mockReset()
    verifySession.mockReset()
    verifySession.mockResolvedValue(undefined)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('无本地令牌时直接进入未登录状态，不发起校验', () => {
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    expect(host.textContent).toContain('登录')
    expect(host.textContent).not.toContain('已登录')
    expect(verifySession).not.toHaveBeenCalled()
  })

  it('本地令牌校验成功后恢复登录状态', async () => {
    window.localStorage.setItem('tazhive:access-token', 'stored-token')
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    expect(host.textContent).toContain('校验中')

    await act(async () => {
      await Promise.resolve()
    })

    expect(host.textContent).toContain('已登录')
  })

  it('校验被服务端拒绝后清除令牌并回到未登录状态', async () => {
    window.localStorage.setItem('tazhive:access-token', 'expired-token')
    verifySession.mockRejectedValue(new Error('登录状态已失效，请重新登录'))
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    await act(async () => {
      // 真实链路中校验请求的 401 由统一响应拦截器上报，这里直接模拟该上报。
      reportAccessTokenRejected('expired-token')
      await Promise.resolve()
    })

    expect(host.textContent).toContain('登录')
    expect(host.textContent).not.toContain('已登录')
    expect(host.textContent).not.toContain('校验失败')
    expect(window.localStorage.getItem('tazhive:access-token')).toBeNull()
  })

  it('校验网络失败时保留令牌并支持重试恢复', async () => {
    window.localStorage.setItem('tazhive:access-token', 'stored-token')
    verifySession.mockRejectedValue(new Error('网络连接异常，请检查后重试'))
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(host.textContent).toContain('校验失败')
    expect(window.localStorage.getItem('tazhive:access-token')).toBe('stored-token')

    verifySession.mockResolvedValue(undefined)
    await act(async () => {
      const retryButton = [...host.querySelectorAll('button')].find(
        (button) => button.textContent === '重新验证',
      )
      retryButton?.click()
    })

    expect(host.textContent).toContain('已登录')
  })

  it('登录成功后持久化令牌并注册到统一请求头', async () => {
    requestLogin.mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    await act(async () => {
      host.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(window.localStorage.getItem('tazhive:access-token')).toBe('new-token')
    expect(requestLogin).toHaveBeenCalledWith({
      username: 'test-user',
      password: 'test-password',
    })
    expect(host.textContent).toContain('已登录')

    let authorization: unknown
    const adapter: AxiosAdapter = async (config) => {
      authorization = config.headers.get('Authorization')
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await createHttpClient().get('/protected', { adapter })
    expect(authorization).toBe('Bearer new-token')
  })

  it('登录失败后展示错误并允许重试', async () => {
    requestLogin.mockRejectedValue(new Error('账号或密码错误'))
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    await act(async () => {
      host.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(host.querySelector('[role="alert"]')?.textContent).toBe('账号或密码错误')
    expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false)
  })

  it('忽略同一时刻发起的重复登录', async () => {
    requestLogin.mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )

    await act(async () => {
      const loginButton = host.querySelector<HTMLButtonElement>('button')
      loginButton?.click()
      loginButton?.click()
    })

    expect(requestLogin).toHaveBeenCalledOnce()
  })

  it('当前令牌被 401 拒绝后清除登录状态和持久化令牌', async () => {
    window.localStorage.setItem('tazhive:access-token', 'expired-token')
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )
    const rejectedAdapter: AxiosAdapter = async (config) => {
      throw new AxiosError('unauthorized', undefined, config, undefined, {
        data: undefined,
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      })
    }

    await act(async () => {
      await createHttpClient()
        .get('/protected', { adapter: rejectedAdapter })
        .catch(() => undefined)
    })

    expect(host.textContent).toContain('登录')
    expect(host.textContent).not.toContain('已登录')
    expect(window.localStorage.getItem('tazhive:access-token')).toBeNull()

    let authorization: unknown
    const successAdapter: AxiosAdapter = async (config) => {
      authorization = config.headers.get('Authorization')
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await createHttpClient().get('/anonymous', { adapter: successAdapter })
    expect(authorization).toBeUndefined()
  })

  it('旧令牌的延迟失效通知不清除新登录状态', async () => {
    requestLogin.mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    act(() =>
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      ),
    )
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button')?.click()
    })

    act(() => reportAccessTokenRejected('old-token'))

    expect(host.textContent).toContain('已登录')
    expect(window.localStorage.getItem('tazhive:access-token')).toBe('new-token')
  })
})
