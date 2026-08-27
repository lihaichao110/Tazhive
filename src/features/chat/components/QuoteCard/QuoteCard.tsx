import type { ChatQuote } from '../../model/types'
import styles from './QuoteCard.module.scss'

interface QuoteCardProps {
  readonly quote: ChatQuote
}

// 在已发送的用户消息中展示引用来源与完整原文。
export function QuoteCard({ quote }: QuoteCardProps) {
  const source = quote.role === 'assistant' ? '引用 AI 回答' : '引用你的问题'

  return (
    <aside className={styles.card} aria-label={source}>
      <span className={styles.source}>{source}</span>
      <p className={styles.text}>{quote.text}</p>
    </aside>
  )
}
