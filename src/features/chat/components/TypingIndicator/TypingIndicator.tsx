import styles from './TypingIndicator.module.scss'

export function TypingIndicator() {
  return (
    <div className={styles.indicator} role="status" aria-label="AI 正在输入">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  )
}
