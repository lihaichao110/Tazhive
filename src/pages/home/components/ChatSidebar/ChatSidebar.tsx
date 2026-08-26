import { Drawer } from 'antd'

import styles from './ChatSidebar.module.scss'

interface ChatSidebarProps {
  readonly isOpen: boolean
  readonly selectedConversationId: string
  readonly onClose: () => void
  readonly onSelect: (conversationId: string) => void
}

interface MockConversation {
  readonly id: string
  readonly title: string
  readonly preview: string
  readonly updatedAt: string
}

const MOCK_CONVERSATIONS: readonly MockConversation[] = [
  {
    id: 'product-roadmap',
    title: '产品路线图讨论',
    preview: '帮我整理下一季度的产品优先级',
    updatedAt: '刚刚',
  },
  {
    id: 'travel-plan',
    title: '杭州周末旅行计划',
    preview: '安排一个轻松的两日游行程',
    updatedAt: '昨天',
  },
  {
    id: 'react-review',
    title: 'React 代码审查',
    preview: '检查组件状态与渲染性能问题',
    updatedAt: '8月24日',
  },
  {
    id: 'weekly-summary',
    title: '项目周报总结',
    preview: '将本周工作整理成简洁的周报',
    updatedAt: '8月21日',
  },
]

// 提供覆盖式对话导航；当前使用 mock 数据，保留选择接口供后续接入真实会话。
export function ChatSidebar({
  isOpen,
  selectedConversationId,
  onClose,
  onSelect,
}: ChatSidebarProps) {
  const handleSelect = (conversationId: string) => {
    onSelect(conversationId)
    onClose()
  }

  return (
    <Drawer
      classNames={{ body: styles.drawerBody, header: styles.drawerHeader }}
      keyboard
      mask={{ closable: true }}
      open={isOpen}
      placement="left"
      rootClassName={styles.drawer}
      size="min(88vw, 320px)"
      title="对话"
      onClose={onClose}
    >
      <nav id="chat-conversation-sidebar" aria-label="历史对话">
        <ul className={styles.conversationList}>
          {MOCK_CONVERSATIONS.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId

            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={styles.conversationButton}
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => handleSelect(conversation.id)}
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
