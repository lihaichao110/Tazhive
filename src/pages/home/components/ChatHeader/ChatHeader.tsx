import { useEffect, useState } from 'react'
import { PanelLeft, UserRound } from 'lucide-react'

import styles from './ChatHeader.module.scss'
import { LoginDrawer } from './LoginDrawer'

import { selectActiveConversationTitle, useConversationStore } from '@/features/chat'
import { useAuth } from '@/features/auth'

// 展示聊天页顶部操作，并直接消费会话导航 Store 中与头部相关的最小状态切片。
export function ChatHeader() {
  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false)
  // 尚未绑定线程的新会话（含首次使用）以“新对话”作为标题兜底。
  const activeConversationTitle = useConversationStore(selectActiveConversationTitle) || '新对话'
  const isSidebarOpen = useConversationStore((state) => state.isSidebarOpen)
  const toggleSidebar = useConversationStore((state) => state.toggleSidebar)
  const { error: loginError, isAuthenticated, isLoggingIn, login } = useAuth()

  useEffect(() => {
    if (isAuthenticated) setIsLoginDrawerOpen(false)
  }, [isAuthenticated])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <button
            type="button"
            className={styles.iconButton}
            aria-controls="chat-conversation-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label="切换侧边栏"
            title="切换侧边栏"
            onClick={toggleSidebar}
          >
            <PanelLeft size={18} />
          </button>
        </div>
        <div className={styles.brand}>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>{activeConversationTitle}</span>
            <span className={styles.brandSubtitle}>AI生成可能会有误，注意核实</span>
          </div>
        </div>
        <div className={styles.right}>
          {isAuthenticated ? (
            <span className={styles.avatar} role="img" aria-label="当前账号已登录">
              <UserRound aria-hidden="true" size={18} />
            </span>
          ) : (
            <button
              type="button"
              className={styles.loginButton}
              onClick={() => setIsLoginDrawerOpen(true)}
            >
              登录
            </button>
          )}
        </div>
      </header>
      <LoginDrawer
        error={loginError}
        isLoggingIn={isLoggingIn}
        isOpen={isLoginDrawerOpen}
        onClose={() => setIsLoginDrawerOpen(false)}
        onLogin={login}
      />
    </>
  )
}
