import type { ReactNode } from 'react'

import { conversationStore } from '../store'

import { ConversationStoreProvider } from '@/features/chat'

interface AppStoreProviderProps {
  readonly children: ReactNode
}

// 在应用根部初始化全局 Store，业务组件仅通过所属 feature 的 Hook 消费状态。
export function AppStoreProvider({ children }: AppStoreProviderProps) {
  return <ConversationStoreProvider store={conversationStore}>{children}</ConversationStoreProvider>
}
