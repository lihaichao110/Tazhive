import type { ChatMessage as ChatMessageModel } from '../../model/types'
import styles from './ChatMessage.module.scss'

interface ChatMessageProps {
  readonly message: ChatMessageModel
  readonly onRetry: (messageId: string) => void
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  // AI 消息靠左、以普通文本展示；用户消息靠右、使用浅灰气泡。
  if (message.role === 'assistant') {
    return (
      <div className={styles.assistantRow}>
        <p className={[styles.assistantText, styles.chat].join(' ')}>{message.content}</p>
        {message.status === 'error' ? (
          <button type="button" className={styles.retryButton} onClick={() => onRetry(message.id)}>
            重试
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.userRow}>
      <p className={[styles.userBubble, styles.chat].join(' ')}>{message.content}</p>
    </div>
  )
}
