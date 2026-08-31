import { createConversationStore } from '@/features/chat'

// App 生命周期内共享唯一会话导航 Store；刷新页面后重新使用 feature 默认状态。
export const conversationStore = createConversationStore()
