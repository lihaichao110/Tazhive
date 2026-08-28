import type { ChatMessage as ChatMessageModel } from '../../model/types'
import { useChatSessionActions } from '../../providers/useChatSession'
import { ChatMessageContent } from '../ChatMessageContent/ChatMessageContent'
import { MessageSelectionActions } from '../MessageSelectionActions/MessageSelectionActions'
import { QuoteCard } from '../QuoteCard/QuoteCard'
import styles from './ChatMessage.module.scss'

interface ChatMessageProps {
  readonly message: ChatMessageModel
}

// 根据消息角色与请求状态选择布局，并为失败的助手消息提供原位重试入口。
export function ChatMessage({ message }: ChatMessageProps) {
  const { retry } = useChatSessionActions()

  // AI 消息靠左、以普通文本展示；用户消息靠右、使用浅灰气泡。
  if (message.role === 'assistant') {
    return (
      <div className={styles.assistantRow}>
        <MessageSelectionActions
          enabled={message.status === 'success'}
          messageId={message.id}
          role={message.role}
        >
          <ChatMessageContent
            content={message.content}
            role={message.role}
            status={message.status}
          />
        </MessageSelectionActions>
        {message.status === 'error' ? (
          <button type="button" className={styles.retryButton} onClick={() => retry(message.id)}>
            重试
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.userRow}>
      <MessageSelectionActions enabled messageId={message.id} role={message.role}>
        <div className={styles.userMessage}>
          {message.quote ? <QuoteCard quote={message.quote} /> : null}
          <ChatMessageContent
            content={message.content}
            role={message.role}
            status={message.status}
          />
        </div>
      </MessageSelectionActions>
    </div>
  )
}
