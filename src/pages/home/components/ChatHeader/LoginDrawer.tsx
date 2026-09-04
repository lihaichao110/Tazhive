import { useState, type FormEvent } from 'react'
import { Button, Drawer, Input } from 'antd'

import styles from './LoginDrawer.module.scss'

import type { LoginCredentials } from '@/features/auth'

interface LoginDrawerProps {
  readonly error: string | null
  readonly isLoggingIn: boolean
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onLogin: (credentials: LoginCredentials) => Promise<void>
}

const DEFAULT_USERNAME = 'lihaichao'
const DEFAULT_PASSWORD = 'lihaichao'

// 收集登录凭证并协调抽屉关闭、校验和提交状态，认证结果仍由上层 Provider 管理。
export function LoginDrawer({ error, isLoggingIn, isOpen, onClose, onLogin }: LoginDrawerProps) {
  const [username, setUsername] = useState(DEFAULT_USERNAME)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const normalizedUsername = username.trim()
  const canSubmit = Boolean(normalizedUsername && password.trim()) && !isLoggingIn

  const handleClose = () => {
    if (isLoggingIn) return
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    void onLogin({ username: normalizedUsername, password })
  }

  return (
    <Drawer
      classNames={{ body: styles.drawerBody, header: styles.drawerHeader }}
      closable={!isLoggingIn}
      keyboard={!isLoggingIn}
      mask={{ closable: !isLoggingIn }}
      open={isOpen}
      placement="bottom"
      rootClassName={styles.drawer}
      size={360}
      title="账号登录"
      onClose={handleClose}
    >
      <form className={styles.form} aria-label="账号登录" onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>账号</span>
          <Input
            autoComplete="username"
            autoFocus
            disabled={isLoggingIn}
            placeholder="请输入账号"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>密码</span>
          <Input.Password
            autoComplete="current-password"
            disabled={isLoggingIn}
            placeholder="请输入密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
        <Button
          block
          className={styles.submitButton}
          disabled={!canSubmit}
          htmlType="submit"
          loading={isLoggingIn}
          type="primary"
        >
          {isLoggingIn ? '登录中…' : '登录'}
        </Button>
      </form>
    </Drawer>
  )
}
