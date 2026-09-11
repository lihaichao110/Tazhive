import { Bubble } from '@ant-design/x'
import { theme } from 'antd'

import type { ChatMessage as ChatMessageModel } from '../../model/types'
import { getCopyableAssistantContent } from '../../lib/messageContent'
import { useChatSessionActions } from '../../providers/useChatSession'
import { AssistantCopyButton } from '../AssistantCopyButton/AssistantCopyButton'
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
  const { token } = theme.useToken()

  // Bubble 只承载消息外壳；流式 Markdown 与结构化内容仍由领域渲染器负责。
  if (message.role === 'assistant') {
    const copyableContent =
      message.status === 'success' ? getCopyableAssistantContent(message.content) : ''

    return (
      <div className={styles.assistantRow}>
        <MessageSelectionActions
          enabled={message.status === 'success'}
          messageId={message.id}
          role={message.role}
        >
          <Bubble
            rootClassName={styles.assistantBubble}
            placement="start"
            variant="borderless"
            content={
              <ChatMessageContent
                content={message.content}
                role={message.role}
                status={message.status}
              />
            }
            footer={copyableContent ? <AssistantCopyButton content={copyableContent} /> : undefined}
            footerPlacement="outer-start"
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
        <Bubble
          rootClassName={styles.userBubble}
          placement="end"
          variant="filled"
          styles={{ content: { backgroundColor: token.colorPrimary, color: '#fff' } }}
          content={
            <div className={styles.userMessage}>
              {message.quote ? <QuoteCard quote={message.quote} /> : null}
              <ChatMessageContent
                content={message.content}
                role={message.role}
                status={message.status}
              />
            </div>
          }
        />
      </MessageSelectionActions>
    </div>
  )
}
