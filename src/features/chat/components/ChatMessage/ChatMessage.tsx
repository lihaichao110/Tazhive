import type { ChatMessage as ChatMessageModel } from '../../model/types'
import { ChatMessageContent } from '../ChatMessageContent/ChatMessageContent'
import styles from './ChatMessage.module.scss'

interface ChatMessageProps {
  readonly message: ChatMessageModel
  readonly onRetry: (messageId: string) => void
}

// 根据消息角色与请求状态选择布局，并为失败的助手消息提供原位重试入口。
export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  // AI 消息靠左、以普通文本展示；用户消息靠右、使用浅灰气泡。
  if (message.role === 'assistant') {
    return (
      <div className={styles.assistantRow}>
        <ChatMessageContent content={message.content} role={message.role} />
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
      <ChatMessageContent content={message.content} role={message.role} />
    </div>
  )
}
