import { createStore, type StoreApi } from 'zustand/vanilla'

export interface ConversationSummary {
  /** 会话唯一标识。 */
  readonly id: string
  /** 会话标题。 */
  readonly title: string
  /** 侧边栏展示的消息摘要。 */
  readonly preview: string
  /** 侧边栏展示的更新时间。 */
  readonly updatedAt: string
}

interface ConversationNavigationState {
  /** 会话列表，按最近创建顺序排列。 */
  readonly conversations: readonly ConversationSummary[]
  /** 当前选中的会话 ID。 */
  readonly selectedConversationId: string
  /** 移动端会话侧边栏是否打开。 */
  readonly isSidebarOpen: boolean
  /** 新建会话时递增，用于重建聊天会话状态。 */
  readonly sessionVersion: number
}

interface ConversationNavigationActions {
  /** 创建、置顶并选中新会话。 */
  readonly createConversation: (title: string) => void
  /** 用服务端会话列表整体替换本地列表。 */
  readonly setConversations: (conversations: readonly ConversationSummary[]) => void
  /** 选中已有会话并关闭侧边栏。 */
  readonly selectConversation: (conversationId: string) => void
  /** 切换侧边栏开关状态。 */
  readonly toggleSidebar: () => void
  /** 关闭侧边栏。 */
  readonly closeSidebar: () => void
  /** 恢复初始会话导航状态。 */
  readonly reset: () => void
}

export type ConversationStore = ConversationNavigationState & ConversationNavigationActions
export type ConversationStoreApi = StoreApi<ConversationStore>

// 刷新页面后使用的默认会话数据。
export const INITIAL_CONVERSATIONS: readonly ConversationSummary[] = [
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

const INITIAL_STATE: ConversationNavigationState = {
  conversations: INITIAL_CONVERSATIONS,
  selectedConversationId: INITIAL_CONVERSATIONS[0].id,
  isSidebarOpen: false,
  sessionVersion: 0,
}

// 创建可注入 ID 生成器的会话导航 Store，便于 App 单例初始化与测试隔离。
export function createConversationStore(
  createId: () => string = () => crypto.randomUUID(),
): ConversationStoreApi {
  return createStore<ConversationStore>()((set, get) => ({
    ...INITIAL_STATE,
    createConversation: (rawTitle) => {
      const title = rawTitle.trim()
      if (!title) return

      const conversation: ConversationSummary = {
        id: createId(),
        title,
        preview: '暂无消息',
        updatedAt: '刚刚',
      }
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        selectedConversationId: conversation.id,
        sessionVersion: state.sessionVersion + 1,
      }))
    },
    // 服务端列表替换后保留当前选中项；选中项不在列表中时回退到首项，避免空选中。
    setConversations: (conversations) => {
      if (conversations.length === 0) return
      set((state) => ({
        conversations,
        selectedConversationId: conversations.some(
          (conversation) => conversation.id === state.selectedConversationId,
        )
          ? state.selectedConversationId
          : conversations[0].id,
      }))
    },
    selectConversation: (conversationId) => {
      if (!get().conversations.some((conversation) => conversation.id === conversationId)) return
      set({ selectedConversationId: conversationId, isSidebarOpen: false })
    },
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    reset: () => set(INITIAL_STATE),
  }))
}

// 当前标题由列表和选中 ID 派生，避免在 Store 中维护重复状态。
export function selectActiveConversationTitle(state: ConversationStore): string {
  return (
    state.conversations.find((conversation) => conversation.id === state.selectedConversationId)
      ?.title ?? ''
  )
}
