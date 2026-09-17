import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { requestLogin } from '../api/login'
import { verifySession } from '../api/verifySession'
import {
  clearStoredAccessToken,
  readStoredAccessToken,
  saveAccessToken,
} from '../model/accessTokenStorage'
import type { AuthController, AuthStatus, LoginCredentials } from '../model/types'
import { AuthContext } from './AuthContext'

import { registerAccessTokenProvider, registerAccessTokenRejectedHandler } from '@/shared/api'

interface AuthProviderProps {
  readonly children: ReactNode
}

// 本地令牌只是待验证凭据；启动校验成功后才向业务层暴露已登录状态。
export function AuthProvider({ children }: AuthProviderProps) {
  const [storedToken] = useState(readStoredAccessToken)
  const [status, setStatus] = useState<AuthStatus>(storedToken ? 'checking' : 'unauthenticated')
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationVersion, setVerificationVersion] = useState(0)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accessTokenRef = useRef(storedToken)
  const loginInFlightRef = useRef(false)
  const verificationRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const unregisterTokenProvider = registerAccessTokenProvider(() => accessTokenRef.current)
    const unregisterRejectedHandler = registerAccessTokenRejectedHandler((rejectedToken) => {
      // 只注销被服务端拒绝的当前会话，避免旧请求的延迟 401 清除新登录状态。
      if (accessTokenRef.current !== rejectedToken) return
      verificationRef.current?.abort()
      accessTokenRef.current = null
      clearStoredAccessToken()
      setStatus('unauthenticated')
      setVerificationError(null)
      setError(null)
    })

    return () => {
      unregisterRejectedHandler()
      unregisterTokenProvider()
    }
  }, [])

  useEffect(() => {
    const token = accessTokenRef.current
    if (!token) return
    const controller = new AbortController()
    verificationRef.current = controller

    // 注册鉴权回调后才发起校验；取消及令牌比对隔离卸载、重试和旧会话响应。
    const isCurrent = () => !controller.signal.aborted && accessTokenRef.current === token
    void verifySession(controller.signal).then(
      () => {
        if (isCurrent()) setStatus('authenticated')
      },
      (verificationFailure: unknown) => {
        if (!isCurrent()) return
        setVerificationError(
          verificationFailure instanceof Error ? verificationFailure.message : '请稍后重试',
        )
        setStatus('error')
      },
    )

    return () => controller.abort()
  }, [verificationVersion])

  const retryVerification = useCallback((): void => {
    if (!accessTokenRef.current) return
    verificationRef.current?.abort()
    setVerificationError(null)
    setStatus('checking')
    setVerificationVersion((version) => version + 1)
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
      verificationError,
      retryVerification,
      isAuthenticated: status === 'authenticated',
      isLoggingIn,
      error,
      login,
    }),
    [status, verificationError, retryVerification, error, isLoggingIn, login],
  )

  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>
}
