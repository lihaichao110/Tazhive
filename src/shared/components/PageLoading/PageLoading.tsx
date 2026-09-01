import styles from './PageLoading.module.scss'

// 为异步页面加载提供统一的全屏等待反馈，并向辅助技术播报当前状态。
export function PageLoading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>页面加载中…</span>
    </div>
  )
}
