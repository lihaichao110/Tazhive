import { Drawer } from 'antd'
import { SquarePen } from 'lucide-react'

import styles from './ChatSidebar.module.scss'

import { useChatSession, useConversationStore, useThreadList } from '@/features/chat'
import { PageLoading } from '@/shared/components/PageLoading'

// 提供覆盖式对话导航：顶部新建入口 + 历史列表，仅订阅列表、选中项与抽屉动作。
export function ChatSidebar() {
  const conversations = useConversationStore((state) => state.conversations)
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId)
  const isOpen = useConversationStore((state) => state.isSidebarOpen)
  const closeSidebar = useConversationStore((state) => state.closeSidebar)
  const selectConversation = useConversationStore((state) => state.selectConversation)
  const startNewConversation = useConversationStore((state) => state.startNewConversation)
  const { isLoading, errorMessage, reload } = useThreadList()
  const { abort } = useChatSession()

  // 新会话在首条消息发送时才创建线程，这里只需重置为空白会话并终止旧回复。
  const handleStartNewConversation = () => {
    abort()
    startNewConversation()
    closeSidebar()
  }

  return (
    <Drawer
      classNames={{ body: styles.drawerBody, header: styles.drawerHeader }}
      closable={{ placement: 'end' }}
      keyboard
      mask={{ closable: true }}
      open={isOpen}
      placement="left"
      rootClassName={styles.drawer}
      size="min(88vw, 320px)"
      title="对话"
      onClose={closeSidebar}
    >
      <nav id="chat-conversation-sidebar" aria-label="历史对话">
        <button
          type="button"
          className={styles.newConversationButton}
          onClick={handleStartNewConversation}
        >
          <SquarePen size={16} aria-hidden="true" />
          新对话
        </button>
        {errorMessage ? (
          <p className={styles.listStatus} role="alert">
            {errorMessage}
            <button type="button" className={styles.retryButton} onClick={reload}>
              重试
            </button>
          </p>
        ) : isLoading ? (
          <PageLoading label="正在加载历史对话…" variant="inline" />
        ) : conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>还没有对话记录</p>
            <p className={styles.emptyHint}>点击上方「新对话」，开始你的第一段对话吧</p>
          </div>
        ) : (
          <ul className={styles.conversationList}>
            {conversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={styles.conversationButton}
                    aria-current={isSelected ? 'page' : undefined}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <span className={styles.conversationHeading}>
                      <span className={styles.conversationTitle}>{conversation.title}</span>
                      <time className={styles.conversationTime}>{conversation.updatedAt}</time>
                    </span>
                    <span className={styles.conversationPreview}>{conversation.preview}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </Drawer>
  )
}
