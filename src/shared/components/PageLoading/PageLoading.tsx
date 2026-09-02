import type { ReactElement } from 'react'

import runningMascot from './assets/tazhive-running.gif'
import staticMascot from './assets/tazhive-running.png'
import styles from './PageLoading.module.scss'

// 为异步页面加载提供统一的全屏等待反馈，并向辅助技术播报当前状态。
export function PageLoading(): ReactElement {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <div className={styles.visual} aria-hidden="true">
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={staticMascot} />
          <img className={styles.mascot} src={runningMascot} alt="" />
        </picture>
        <span className={styles.shadow} />
      </div>
      <span className={styles.label}>小塔正在赶来…</span>
    </div>
  )
}
