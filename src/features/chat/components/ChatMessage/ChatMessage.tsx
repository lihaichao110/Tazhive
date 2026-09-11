import { Bubble } from '@ant-design/x'
import { theme } from 'antd'
import { RotateCcw } from 'lucide-react'

import type { ChatMessage as ChatMessageModel } from '../../model/types'
import { getCopyableAssistantContent } from '../../lib/messageContent'
import { useChatSession } from '../../providers/useChatSession'
import { AssistantCopyButton } from '../AssistantCopyButton/AssistantCopyButton'
import { ChatMessageContent } from '../ChatMessageContent/ChatMessageContent'
import { MessageSelectionActions } from '../MessageSelectionActions/MessageSelectionActions'
import { QuoteCard } from '../QuoteCard/QuoteCard'
import styles from './ChatMessage.module.scss'

interface ChatMessageProps {
  readonly message: ChatMessageModel
}

interface AssistantMessageFooterProps {
  readonly copyableContent: string
  readonly retryLabel?: string
  readonly onRetry?: () => void
}

// 统一承载 AI 回答的复制和重新生成操作，避免 Bubble 的 footer 配置堆积状态分支。
function AssistantMessageFooter({
  copyableContent,
  retryLabel,
  onRetry,
}: AssistantMessageFooterProps) {
  return (
    <div className={styles.assistantFooter}>
      {copyableContent ? <AssistantCopyButton content={copyableContent} /> : null}
      {onRetry && retryLabel ? (
        <button
          type="button"
          className={styles.retryButton}
          aria-label={retryLabel}
          title={retryLabel}
          onClick={onRetry}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

// 根据消息角色与请求状态选择布局，并为最新的已结束 AI 回答提供重新生成入口。
export function ChatMessage({ message }: ChatMessageProps) {
  const { messages, retry } = useChatSession()
  const { token } = theme.useToken()

  // Bubble 只承载消息外壳；流式 Markdown 与结构化内容仍由领域渲染器负责。
  if (message.role === 'assistant') {
    const copyableContent =
      message.status === 'success' ? getCopyableAssistantContent(message.content) : ''
    const latestAssistantMessage = messages.findLast((item) => item.role === 'assistant')
    const canRetry =
      latestAssistantMessage?.id === message.id &&
      (message.status === 'success' || message.status === 'error')
    const retryLabel = message.status === 'success' ? '重新生成回答' : '重试回答'
    const assistantFooter =
      copyableContent || canRetry ? (
        <AssistantMessageFooter
          copyableContent={copyableContent}
          retryLabel={canRetry ? retryLabel : undefined}
          onRetry={canRetry ? () => retry(message.id) : undefined}
        />
      ) : undefined

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
            footer={assistantFooter}
            footerPlacement="outer-start"
          />
        </MessageSelectionActions>
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
