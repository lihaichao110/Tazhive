import type { ReactNode } from 'react'

import styles from './AuthInitializationBoundary.module.scss'

import { useAuth } from '@/features/auth'
import { PageLoading } from '@/shared/components/PageLoading'

interface AuthInitializationBoundaryProps {
  readonly children: ReactNode
}

// 在登录态确定前隔离页面挂载，避免业务请求使用尚未验证的本地凭据。
export function AuthInitializationBoundary({ children }: AuthInitializationBoundaryProps) {
  const { status, verificationError, retryVerification } = useAuth()

  if (status === 'checking') return <PageLoading label="正在验证登录状态…" />
  if (status === 'error') {
    return (
      <main className={styles.errorPage}>
        <div role="alert">
          <h1>暂时无法验证登录状态</h1>
          <p>{verificationError}</p>
          <p>已保留登录凭据，请检查网络后重试。</p>
        </div>
        <button type="button" onClick={retryVerification}>
          重新验证
        </button>
      </main>
    )
  }

  return children
}
