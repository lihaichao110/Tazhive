import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { ChatSessionContext, type ChatSessionValue } from './ChatSessionContext'
import { useChat } from '../hooks/useChat'
import type { ChatQuote } from '../model/types'

interface ChatSessionProviderProps {
  readonly children: ReactNode
}

// 在当前聊天页面内聚合会话状态与业务动作，避免展示组件跨层透传参数。
export function ChatSessionProvider({ children }: ChatSessionProviderProps) {
  const chat = useChat()
  const [quote, setQuote] = useState<ChatQuote | null>(null)

  // 发送成功后引用已进入消息协议，应同步清空；请求被拒绝时保留引用供用户重试。
  const sendMessage = useCallback(
    (text: string): boolean => {
      const accepted = chat.send(text, quote ?? undefined)
      if (accepted) setQuote(null)
      return accepted
    },
    [chat, quote],
  )
  const clearQuote = useCallback(() => setQuote(null), [])

  const value = useMemo<ChatSessionValue>(
    () => ({
      messages: chat.messages,
      isReplying: chat.isReplying,
      error: chat.error,
      mode: chat.mode,
      quote,
      setMode: chat.setMode,
      sendMessage,
      abort: chat.abort,
      retry: chat.retry,
      submitInsurance: chat.submitInsurance,
      selectQuote: setQuote,
      clearQuote,
    }),
    [chat, clearQuote, quote, sendMessage],
  )

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
}
