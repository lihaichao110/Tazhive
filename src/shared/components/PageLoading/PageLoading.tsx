import type { ReactElement } from 'react'

import runningMascot from './assets/tazhive-running.gif'
import staticMascot from './assets/tazhive-running.png'
import styles from './PageLoading.module.scss'

const DEFAULT_LABEL = '小塔正在赶来…'

interface PageLoadingProps {
  /** 等待提示文案，应描述当前加载场景，如“正在加载历史对话…”。 */
  readonly label?: string
  /** page 为全屏占位（默认）；inline 用于侧边栏等局部内容区，去掉全屏高度与背景。 */
  readonly variant?: 'inline' | 'page'
}

// 提供统一的品牌加载反馈：页面级全屏等待与局部内容区等待共用同一视觉与无障碍播报。
export function PageLoading({
  label = DEFAULT_LABEL,
  variant = 'page',
}: PageLoadingProps): ReactElement {
  const containerClass =
    variant === 'inline' ? `${styles.loading} ${styles.inline}` : styles.loading

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className={styles.visual} aria-hidden="true">
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={staticMascot} />
          <img className={styles.mascot} src={runningMascot} alt="" />
        </picture>
        <span className={styles.shadow} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
