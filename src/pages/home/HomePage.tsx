import { useCallback, useEffect, useRef } from 'react'

import { ChatHeader } from './components/ChatHeader/ChatHeader'
import { ChatSidebar } from './components/ChatSidebar/ChatSidebar'
import { useMobileViewportLayout } from './hooks/useMobileViewportLayout'
import styles from './HomePage.module.scss'

import {
  ChatComposer,
  ChatMessage,
  ChatSessionProvider,
  DynamicCardHostProvider,
  TypingIndicator,
  useChatSession,
  useConversationStore,
  type DynamicCardReadyHandler,
} from '@/features/chat'
import { useAuth } from '@/features/auth'
import { PageLoading } from '@/shared/components/PageLoading'

// 组合聊天页各区域，并协调流式回复、错误提示和自动滚动等页面级行为。
function HomePageContent() {
  const {
    messages,
    isReplying,
    isSlow,
    error,
    clearError,
    isHistoryLoading,
    historyError,
    retryHistory,
  } = useChatSession()
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId)
  const { isAuthenticated } = useAuth()
  const chatPageRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLElement>(null)
  const handledSurfaceIdsRef = useRef(new Set<string>())
  const wasAuthenticatedRef = useRef(isAuthenticated)
  useMobileViewportLayout(chatPageRef)
  // 思考或正文已在消息内展示时隐藏输入动画，避免和页面等待态重复反馈。
  const isReplyContentVisible = messages.some(
    (message) =>
      message.role === 'assistant' &&
      (message.status === 'loading' || message.status === 'updating') &&
      message.content.length > 0,
  )
  // 卡片挂载后按当前页面策略滚到底部，同一 Surface 只处理一次。
  const handleDynamicCardReady = useCallback<DynamicCardReadyHandler>((surfaceId) => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea || handledSurfaceIdsRef.current.has(surfaceId)) return

    handledSurfaceIdsRef.current.add(surfaceId)
    scrollArea.scrollTop = scrollArea.scrollHeight
  }, [])

  // 消息内容更新后统一滚到底部，文本与动态表单同时出现时保持连续阅读位置。
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return
    scrollArea.scrollTop = scrollArea.scrollHeight
  }, [messages, isReplying, isSlow])

  // 仅响应一次真实的登录成功转换；初次读取本地令牌时不应清除既有错误状态。
  useEffect(() => {
    if (!wasAuthenticatedRef.current && isAuthenticated) clearError()
    wasAuthenticatedRef.current = isAuthenticated
  }, [clearError, isAuthenticated])

  return (
    <div ref={chatPageRef} className={styles.chatPage}>
      <ChatHeader />
      <ChatSidebar />
      <DynamicCardHostProvider onReady={handleDynamicCardReady}>
        <main ref={scrollAreaRef} className={styles.scrollArea} aria-label="对话内容">
          {isHistoryLoading ? (
            <div className={styles.historyState}>
              <PageLoading label="正在加载对话记录…" variant="inline" />
            </div>
          ) : historyError ? (
            <div className={styles.historyState} role="alert">
              <p className={styles.historyStateTitle}>对话记录加载失败</p>
              <p className={styles.historyStateHint}>{historyError}</p>
              <button
                type="button"
                className={styles.historyRetry}
                onClick={() => void retryHistory()}
              >
                重试
              </button>
            </div>
          ) : messages.length === 0 && selectedConversationId ? (
            <div className={styles.historyState}>
              <p className={styles.historyStateTitle}>暂无对话记录</p>
            </div>
          ) : (
            <div className={styles.messageList}>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isReplying && isSlow ? (
                <p className={styles.waitingNotice} role="status">
                  响应较慢，请稍候
                </p>
              ) : null}
              {isReplying && !isSlow && !isReplyContentVisible ? <TypingIndicator /> : null}
            </div>
          )}
        </main>
      </DynamicCardHostProvider>
      <footer className={styles.composerBar}>
        {error && !isHistoryLoading && !historyError ? (
          <div className={styles.errorNotice} role="alert">
            {error}
          </div>
        ) : null}
        <div className={styles.composerWrap}>
          <ChatComposer />
        </div>
      </footer>
    </div>
  )
}

// 为当前页面建立独立聊天会话，离开页面后自动释放全部会话状态。
export function HomePage() {
  const sessionVersion = useConversationStore((state) => state.sessionVersion)

  return (
    <ChatSessionProvider key={sessionVersion}>
      <HomePageContent />
    </ChatSessionProvider>
  )
}
