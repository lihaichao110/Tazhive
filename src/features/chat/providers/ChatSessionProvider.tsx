import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ChatSessionContext, type ChatSessionValue } from './ChatSessionContext'
import { requestListThreadMessages } from '../api/listThreadMessages'
import { useChat } from '../hooks/useChat'
import { useThreadBootstrap } from '../hooks/useThreadBootstrap'
import type { ChatQuote } from '../model/types'

interface ChatSessionProviderProps {
  readonly children: ReactNode
}

// 在当前聊天页面内聚合会话状态与业务动作，避免展示组件跨层透传参数。
export function ChatSessionProvider({ children }: ChatSessionProviderProps) {
  const chat = useChat()
  const {
    error: bootstrapError,
    cancelPreparing,
    clearError: clearBootstrapError,
    ensureThread,
    getThreadId,
    isPreparing,
  } = useThreadBootstrap()
  const [quote, setQuote] = useState<ChatQuote | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const historyThreadIdRef = useRef('')
  // 递增序号用于隔离过期响应；切换更快的后续会话时，旧请求不得覆盖新内容。
  const historyRequestIdRef = useRef(0)

  useEffect(
    () => () => {
      historyRequestIdRef.current += 1
    },
    [],
  )

  // 切换已有会话时清空旧内容并拉取完整历史，失败状态留在目标会话供原地重试。
  const loadHistory = useCallback(
    async (threadId: string): Promise<void> => {
      if (!threadId) return
      const requestId = historyRequestIdRef.current + 1
      historyRequestIdRef.current = requestId
      historyThreadIdRef.current = threadId
      chat.abort()
      cancelPreparing()
      chat.clearMessages()
      chat.clearError()
      clearBootstrapError()
      setQuote(null)
      setHistoryError(null)
      setIsHistoryLoading(true)

      try {
        const history = await requestListThreadMessages(threadId)
        if (requestId !== historyRequestIdRef.current) return
        chat.replaceHistory(history)
      } catch (error) {
        if (requestId !== historyRequestIdRef.current) return
        setHistoryError(error instanceof Error ? error.message : '历史消息加载失败，请稍后重试')
      } finally {
        if (requestId === historyRequestIdRef.current) setIsHistoryLoading(false)
      }
    },
    [cancelPreparing, chat, clearBootstrapError],
  )

  const retryHistory = useCallback(async (): Promise<void> => {
    await loadHistory(historyThreadIdRef.current)
  }, [loadHistory])

  // 新会话首条消息先建线程再发送；建线程失败则拒绝发送，让用户保留草稿重试。
  // 发送成功后引用已进入消息协议，应同步清空；请求被拒绝时保留引用供用户重试。
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (isHistoryLoading) return false
      const threadId = await ensureThread(text)
      if (!threadId) return false
      const accepted = chat.send(text, quote ?? undefined, threadId)
      if (accepted) setQuote(null)
      return accepted
    },
    [chat, ensureThread, isHistoryLoading, quote],
  )

  // 重试只发生在已有消息的会话中，当前选中 ID 即服务端线程 ID。
  const retry = useCallback(
    (messageId: string): void => {
      if (isHistoryLoading) return
      chat.retry(messageId, getThreadId())
    },
    [chat, getThreadId, isHistoryLoading],
  )

  const clearQuote = useCallback(() => setQuote(null), [])

  // 动态卡片只存在于已建立的会话中，动作继续沿用当前线程请求模型。
  const submitCardAction = useCallback(
    (payload: Parameters<typeof chat.submitCardAction>[0]): boolean => {
      if (isHistoryLoading) return false
      return chat.submitCardAction(payload, getThreadId())
    },
    [chat, getThreadId, isHistoryLoading],
  )

  // 登录成功后同步清理两条请求链路，避免旧会话错误在新令牌下继续显示。
  const clearError = useCallback((): void => {
    chat.clearError()
    clearBootstrapError()
    setHistoryError(null)
  }, [chat, clearBootstrapError])

  const value = useMemo<ChatSessionValue>(
    () => ({
      messages: chat.messages,
      // 建线程等待期与流式回复期统一呈现“回复中”，避免点击发送后界面看似卡住。
      isReplying: chat.isReplying || isPreparing || isHistoryLoading,
      isSlow: chat.isSlow,
      error: chat.error ?? bootstrapError,
      isHistoryLoading,
      historyError,
      clearError,
      mode: chat.mode,
      quote,
      setMode: chat.setMode,
      sendMessage,
      abort: chat.abort,
      loadHistory,
      retryHistory,
      retry,
      submitCardAction,
      selectQuote: setQuote,
      clearQuote,
    }),
    [
      bootstrapError,
      chat,
      clearError,
      clearQuote,
      historyError,
      isHistoryLoading,
      isPreparing,
      loadHistory,
      quote,
      retry,
      retryHistory,
      sendMessage,
      submitCardAction,
    ],
  )

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
}
