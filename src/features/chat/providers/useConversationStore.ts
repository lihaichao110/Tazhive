import { useContext } from 'react'
import { useStore } from 'zustand'

import { ConversationStoreContext } from './ConversationStoreContext'
import type { ConversationStore } from '../model/conversationStore'

// 按 selector 订阅会话导航状态，避免无关字段变化触发组件重渲染。
export function useConversationStore<T>(selector: (state: ConversationStore) => T): T {
  const store = useContext(ConversationStoreContext)
  if (!store) throw new Error('useConversationStore 必须在 ConversationStoreProvider 内使用。')
  return useStore(store, selector)
}
