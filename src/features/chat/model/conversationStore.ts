import { createStore, type StoreApi } from 'zustand/vanilla'

export interface ConversationSummary {
  /** 会话唯一标识，与服务端线程 ID 一致。 */
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
  /** 当前选中的会话 ID；空串表示尚未绑定服务端线程的新会话。 */
  readonly selectedConversationId: string
  /** 移动端会话侧边栏是否打开。 */
  readonly isSidebarOpen: boolean
  /** 新建会话时递增，用于重建聊天会话状态。 */
  readonly sessionVersion: number
}

interface ConversationNavigationActions {
  /** 将当前聊天会话绑定到新建的服务端线程，不重建聊天会话状态。 */
  readonly adoptConversation: (threadId: string, title: string) => void
  /** 进入尚未绑定线程的新会话，重建聊天会话状态。 */
  readonly startNewConversation: () => void
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

// 首次使用或刷新后尚未拉取到服务端数据时，会话列表从空开始，由侧边栏拉取后填充。
export const INITIAL_CONVERSATIONS: readonly ConversationSummary[] = []

const INITIAL_STATE: ConversationNavigationState = {
  conversations: INITIAL_CONVERSATIONS,
  selectedConversationId: '',
  isSidebarOpen: false,
  sessionVersion: 0,
}

// 新建线程尚未产生首条消息时的列表项占位内容。
function createPendingSummary(threadId: string, title: string): ConversationSummary {
  return { id: threadId, title, preview: '暂无消息', updatedAt: '刚刚' }
}

// 创建可独立实例化的会话导航 Store，便于 App 单例初始化与测试隔离。
export function createConversationStore(): ConversationStoreApi {
  return createStore<ConversationStore>()((set, get) => ({
    ...INITIAL_STATE,
    // 首条消息自动建线程后绑定当前会话：不递增 sessionVersion，
    // 否则聊天 Provider 会在消息发出前被重建，导致刚建立的会话状态丢失。
    adoptConversation: (threadId, rawTitle) => {
      const title = rawTitle.trim()
      if (!title || !threadId) return

      set((state) => ({
        conversations: [createPendingSummary(threadId, title), ...state.conversations],
        selectedConversationId: threadId,
      }))
    },
    // 进入新会话：清空选中并重建聊天子树；历史列表保留，供随时切回。
    startNewConversation: () =>
      set((state) => ({ selectedConversationId: '', sessionVersion: state.sessionVersion + 1 })),
    // 服务端列表替换后保留当前选中项；空列表或选中项丢失时清空/回退，避免长期悬空选中。
    setConversations: (conversations) => {
      set((state) => ({
        conversations,
        selectedConversationId: conversations.some(
          (conversation) => conversation.id === state.selectedConversationId,
        )
          ? state.selectedConversationId
          : (conversations[0]?.id ?? ''),
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
