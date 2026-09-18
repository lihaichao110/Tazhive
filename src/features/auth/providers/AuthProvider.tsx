import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { requestLogin } from '../api/login'
import {
  clearStoredAccessToken,
  readStoredAccessToken,
  saveTokenPair,
} from '../model/accessTokenStorage'
import { requestRefreshedTokenPair } from '../model/tokenRefresh'
import type { AuthController, AuthStatus, LoginCredentials } from '../model/types'
import { AuthContext } from './AuthContext'

import {
  registerAccessTokenProvider,
  registerAccessTokenRejectedHandler,
  registerAccessTokenRefresher,
} from '@/shared/api'

interface AuthProviderProps {
  readonly children: ReactNode
}

// 本地令牌直接作为已登录凭据暴露，有效性由统一拦截器的静默刷新与 401 拒绝链路兜底。
export function AuthProvider({ children }: AuthProviderProps) {
  const [storedToken] = useState(readStoredAccessToken)
  const [status, setStatus] = useState<AuthStatus>(
    storedToken ? 'authenticated' : 'unauthenticated',
  )
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accessTokenRef = useRef(storedToken)
  const loginInFlightRef = useRef(false)

  useEffect(() => {
    const unregisterTokenProvider = registerAccessTokenProvider(() => accessTokenRef.current)
    const unregisterRejectedHandler = registerAccessTokenRejectedHandler((rejectedToken) => {
      // 只注销被服务端拒绝的当前会话，避免旧请求的延迟 401 清除新登录状态。
      if (accessTokenRef.current !== rejectedToken) return
      accessTokenRef.current = null
      clearStoredAccessToken()
      setStatus('unauthenticated')
      setError(null)
    })
    const unregisterRefresher = registerAccessTokenRefresher(async () => {
      const tokenBeforeRefresh = accessTokenRef.current
      const nextTokens = await requestRefreshedTokenPair()
      if (!nextTokens) return false
      // 刷新期间发生重新登录时丢弃结果，避免旧刷新响应覆盖新会话的令牌。
      if (accessTokenRef.current !== tokenBeforeRefresh) return false
      saveTokenPair(nextTokens)
      accessTokenRef.current = nextTokens.access_token
      return true
    })

    return () => {
      unregisterRefresher()
      unregisterRejectedHandler()
      unregisterTokenProvider()
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    if (loginInFlightRef.current || accessTokenRef.current) return

    loginInFlightRef.current = true
    setIsLoggingIn(true)
    setError(null)

    try {
      const response = await requestLogin(credentials)
      saveTokenPair(response)
      // ref 与持久化存储同步更新，确保紧随登录之后的请求立即读取到新令牌。
      accessTokenRef.current = response.access_token
      setStatus('authenticated')
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试')
    } finally {
      loginInFlightRef.current = false
      setIsLoggingIn(false)
    }
  }, [])

  const controller = useMemo<AuthController>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      isLoggingIn,
      error,
      login,
    }),
    [status, error, isLoggingIn, login],
  )

  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>
}
