import { useContext } from 'react'

import { ChatSessionContext, type ChatSessionValue } from './ChatSessionContext'

// 读取当前页面的聊天会话；缺少 Provider 说明组件被挂载到了错误的业务边界。
export function useChatSession(): ChatSessionValue {
  const session = useContext(ChatSessionContext)
  if (!session) throw new Error('useChatSession 必须在 ChatSessionProvider 内使用。')
  return session
}

// 为只触发业务动作的深层组件提供语义明确的会话入口。
export function useChatSessionActions(): Pick<
  ChatSessionValue,
  'abort' | 'clearQuote' | 'retry' | 'selectQuote' | 'submitInsurance'
> {
  const { abort, clearQuote, retry, selectQuote, submitInsurance } = useChatSession()
  return { abort, clearQuote, retry, selectQuote, submitInsurance }
}
