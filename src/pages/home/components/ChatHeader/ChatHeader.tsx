import { PanelLeft, Share2, SquarePen } from 'lucide-react'

import styles from './ChatHeader.module.scss'

export function ChatHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="切换侧边栏"
          title="切换侧边栏"
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
          <span className={styles.brandSubtitle}>AI 生成可能有误</span>
        </div>
      </div>
      <div className={styles.right}>
        <button type="button" className={styles.iconButton} aria-label="分享对话" title="分享对话">
          <Share2 size={16} />
        </button>
      </div>
    </header>
  )
}
