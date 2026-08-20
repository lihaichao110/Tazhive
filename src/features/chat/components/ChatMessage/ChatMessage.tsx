import type { ChatMessage as ChatMessageModel } from '../../model/types'
import styles from './ChatMessage.module.scss'

interface ChatMessageProps {
  readonly message: ChatMessageModel
}

export function ChatMessage({ message }: ChatMessageProps) {
  // AI 消息靠左、以普通文本展示；用户消息靠右、使用浅灰气泡。
  if (message.role === 'assistant') {
    return <p className={[styles.assistantText, styles.chat].join(' ')}>{message.content}</p>
  }

  return (
    <div className={styles.userRow}>
      <p className={[styles.userBubble, styles.chat].join(' ')}>{message.content}</p>
    </div>
  )
}
