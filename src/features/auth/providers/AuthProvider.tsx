import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { requestLogin } from '../api/login'
import {
  clearStoredAccessToken,
  readStoredAccessToken,
  saveAccessToken,
} from '../model/accessTokenStorage'
import type { AuthController, LoginCredentials } from '../model/types'
import { AuthContext } from './AuthContext'

import { registerAccessTokenProvider, registerAccessTokenRejectedHandler } from '@/shared/api'

interface AuthProviderProps {
  readonly children: ReactNode
}

// 在应用生命周期内管理登录状态，并把最新令牌接入统一 HTTP 客户端。
export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState(readStoredAccessToken)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accessTokenRef = useRef(accessToken)
  const loginInFlightRef = useRef(false)

  useEffect(() => {
    const unregisterTokenProvider = registerAccessTokenProvider(() => accessTokenRef.current)
    const unregisterRejectedHandler = registerAccessTokenRejectedHandler((rejectedToken) => {
      // 只注销被服务端拒绝的当前会话，避免旧请求的延迟 401 清除新登录状态。
      if (accessTokenRef.current !== rejectedToken) return
      accessTokenRef.current = null
      clearStoredAccessToken()
      setAccessToken(null)
      setError(null)
    })

    return () => {
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
      saveAccessToken(response.access_token)
      // ref 与持久化存储同步更新，确保紧随登录之后的请求立即读取到新令牌。
      accessTokenRef.current = response.access_token
      setAccessToken(response.access_token)
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试')
    } finally {
      loginInFlightRef.current = false
      setIsLoggingIn(false)
    }
  }, [])

  const controller = useMemo<AuthController>(
    () => ({
      isAuthenticated: Boolean(accessToken),
      isLoggingIn,
      error,
      login,
    }),
    [accessToken, error, isLoggingIn, login],
  )

  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>
}
