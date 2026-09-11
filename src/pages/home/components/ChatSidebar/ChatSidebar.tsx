import { Drawer } from 'antd'
import { MessageSquare, SquarePen } from 'lucide-react'

import styles from './ChatSidebar.module.scss'

import { useChatSession, useConversationStore, useThreadList } from '@/features/chat'
import { PageLoading } from '@/shared/components/PageLoading'

const CONVERSATION_ICON_COLOR_COUNT = 8

// 根据会话 ID 生成稳定色号，并避开最近两项，减少列表中连续出现近似配色。
function getConversationIconColorIndexes(conversationIds: readonly string[]): number[] {
  return conversationIds.reduce<number[]>((colorIndexes, conversationId) => {
    const seed = [...conversationId].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    )
    let colorIndex = seed % CONVERSATION_ICON_COLOR_COUNT
    const recentColorIndexes = colorIndexes.slice(-2)

    while (recentColorIndexes.includes(colorIndex)) {
      colorIndex = (colorIndex + 1) % CONVERSATION_ICON_COLOR_COUNT
    }

    colorIndexes.push(colorIndex)
    return colorIndexes
  }, [])
}

// 提供覆盖式对话导航：顶部新建入口 + 历史列表，仅订阅列表、选中项与抽屉动作。
export function ChatSidebar() {
  const conversations = useConversationStore((state) => state.conversations)
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId)
  const isOpen = useConversationStore((state) => state.isSidebarOpen)
  const closeSidebar = useConversationStore((state) => state.closeSidebar)
  const selectConversation = useConversationStore((state) => state.selectConversation)
  const startNewConversation = useConversationStore((state) => state.startNewConversation)
  const { isLoading, errorMessage, reload } = useThreadList()
  const { abort, loadHistory } = useChatSession()
  const conversationIconColorIndexes = getConversationIconColorIndexes(
    conversations.map((conversation) => conversation.id),
  )

  // 新会话在首条消息发送时才创建线程，这里只需重置为空白会话并终止旧回复。
  const handleStartNewConversation = () => {
    abort()
    startNewConversation()
    closeSidebar()
  }

  // 每次点击都重新拉取服务端历史，包括重复点击当前已选中的会话。
  const handleSelectConversation = (conversationId: string): void => {
    selectConversation(conversationId)
    void loadHistory(conversationId)
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
      size="min(88vw, 280px)"
      title="最近对话"
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
            {conversations.map((conversation, index) => {
              const isSelected = conversation.id === selectedConversationId

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={styles.conversationButton}
                    aria-current={isSelected ? 'page' : undefined}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <span
                      className={styles.conversationIcon}
                      data-icon-color={conversationIconColorIndexes[index]}
                      aria-hidden="true"
                    >
                      <MessageSquare size={15} strokeWidth={1.8} />
                    </span>
                    <span className={styles.conversationHeading}>
                      <span className={styles.conversationTitle}>{conversation.title}</span>
                      <time className={styles.conversationTime}>{conversation.updatedAt}</time>
                    </span>
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
