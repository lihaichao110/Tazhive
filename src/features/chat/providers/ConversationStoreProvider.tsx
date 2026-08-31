import type { ReactNode } from 'react'

import { ConversationStoreContext } from './ConversationStoreContext'
import type { ConversationStoreApi } from '../model/conversationStore'

interface ConversationStoreProviderProps {
  readonly children: ReactNode
  readonly store: ConversationStoreApi
}

// 将 App 创建的会话 Store 实例注入 React 树，保持业务模块不依赖 app 层实现。
export function ConversationStoreProvider({ children, store }: ConversationStoreProviderProps) {
  return (
    <ConversationStoreContext.Provider value={store}>{children}</ConversationStoreContext.Provider>
  )
}
