import { Drawer } from 'antd'

import styles from './ChatSidebar.module.scss'

import { useConversationStore } from '@/features/chat'

// 提供覆盖式对话导航，仅订阅列表、选中项与抽屉动作。
export function ChatSidebar() {
  const conversations = useConversationStore((state) => state.conversations)
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId)
  const isOpen = useConversationStore((state) => state.isSidebarOpen)
  const closeSidebar = useConversationStore((state) => state.closeSidebar)
  const selectConversation = useConversationStore((state) => state.selectConversation)

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
      </nav>
    </Drawer>
  )
}
