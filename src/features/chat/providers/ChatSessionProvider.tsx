import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { ChatSessionContext, type ChatSessionValue } from './ChatSessionContext'
import { useChat } from '../hooks/useChat'
import { useThreadBootstrap } from '../hooks/useThreadBootstrap'
import type { ChatQuote } from '../model/types'

interface ChatSessionProviderProps {
  readonly children: ReactNode
}

// 在当前聊天页面内聚合会话状态与业务动作，避免展示组件跨层透传参数。
export function ChatSessionProvider({ children }: ChatSessionProviderProps) {
  const chat = useChat()
  const { error: bootstrapError, ensureThread, getThreadId, isPreparing } = useThreadBootstrap()
  const [quote, setQuote] = useState<ChatQuote | null>(null)

  // 新会话首条消息先建线程再发送；建线程失败则拒绝发送，让用户保留草稿重试。
  // 发送成功后引用已进入消息协议，应同步清空；请求被拒绝时保留引用供用户重试。
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const threadId = await ensureThread(text)
      if (!threadId) return false
      const accepted = chat.send(text, quote ?? undefined, threadId)
      if (accepted) setQuote(null)
      return accepted
    },
    [chat, ensureThread, quote],
  )

  // 重试只发生在已有消息的会话中，当前选中 ID 即服务端线程 ID。
  const retry = useCallback(
    (messageId: string): void => {
      chat.retry(messageId, getThreadId())
    },
    [chat, getThreadId],
  )

  const clearQuote = useCallback(() => setQuote(null), [])

  const value = useMemo<ChatSessionValue>(
    () => ({
      messages: chat.messages,
      // 建线程等待期与流式回复期统一呈现“回复中”，避免点击发送后界面看似卡住。
      isReplying: chat.isReplying || isPreparing,
      error: chat.error ?? bootstrapError,
      mode: chat.mode,
      quote,
      setMode: chat.setMode,
      sendMessage,
      abort: chat.abort,
      retry,
      submitInsurance: chat.submitInsurance,
      selectQuote: setQuote,
      clearQuote,
    }),
    [bootstrapError, chat, clearQuote, isPreparing, quote, retry, sendMessage],
  )

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
}
