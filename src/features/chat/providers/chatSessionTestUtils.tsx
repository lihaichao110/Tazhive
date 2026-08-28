import { useMemo, type ReactNode } from 'react'

import { ChatSessionContext, type ChatSessionValue } from './ChatSessionContext'
import { createChatSessionStub } from './createChatSessionStub'

interface ChatSessionTestProviderProps {
  readonly children: ReactNode
  readonly value?: Partial<ChatSessionValue>
}

// 将待测聊天组件挂载到显式的测试会话边界内。
export function ChatSessionTestProvider({ children, value }: ChatSessionTestProviderProps) {
  const session = useMemo(() => createChatSessionStub(value), [value])
  return <ChatSessionContext.Provider value={session}>{children}</ChatSessionContext.Provider>
}
