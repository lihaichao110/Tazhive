import { PanelLeft, SquarePen } from 'lucide-react'

import styles from './ChatHeader.module.scss'

interface ChatHeaderProps {
  readonly isSidebarOpen: boolean
  readonly onSidebarToggle: () => void
}

// 展示聊天页顶部操作，并将侧边栏开关意图交给页面层协调。
export function ChatHeader({ isSidebarOpen, onSidebarToggle }: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.iconButton}
          aria-controls="chat-conversation-sidebar"
          aria-expanded={isSidebarOpen}
          aria-label="切换侧边栏"
          title="切换侧边栏"
          onClick={onSidebarToggle}
        >
          <PanelLeft size={18} />
        </button>
        <button type="button" className={styles.iconButton} aria-label="新建对话" title="新建对话">
          <SquarePen size={18} />
        </button>
      </div>
      <div className={styles.brand}>
        <div className={styles.brandText}>
          <span className={styles.brandTitle}>问候</span>
          <span className={styles.brandSubtitle}>AI生成可能会有误，注意核实</span>
        </div>
      </div>
    </header>
  )
}
