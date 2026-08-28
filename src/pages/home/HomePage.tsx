import { useCallback, useEffect, useRef, useState } from 'react'

import { ChatHeader } from './components/ChatHeader/ChatHeader'
import { ChatSidebar } from './components/ChatSidebar/ChatSidebar'
import styles from './HomePage.module.scss'

import {
  ChatComposer,
  ChatMessage,
  ChatSessionProvider,
  DynamicCardHostProvider,
  TypingIndicator,
  useChatSession,
  type DynamicCardReadyHandler,
} from '@/features/chat'

// 组合聊天页各区域，并协调流式回复、错误提示和自动滚动等页面级行为。
function HomePageContent() {
  const { messages, isReplying, error } = useChatSession()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState('product-roadmap')
  const scrollAreaRef = useRef<HTMLElement>(null)
  const handledSurfaceIdsRef = useRef(new Set<string>())
  // 流式文本已经可见时不再显示输入动画，避免同时出现两种“正在回复”反馈。
  const isStreamingContentVisible = messages.some(
    (message) =>
      message.role === 'assistant' && message.status === 'updating' && message.content.length > 0,
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
  }, [messages, isReplying])

  return (
    <div className={styles.chatPage}>
      <ChatHeader
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
      />
      <ChatSidebar
        isOpen={isSidebarOpen}
        selectedConversationId={selectedConversationId}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={setSelectedConversationId}
      />
      <DynamicCardHostProvider onReady={handleDynamicCardReady}>
        <main ref={scrollAreaRef} className={styles.scrollArea} aria-label="对话内容">
          <div className={styles.messageList}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isReplying && !isStreamingContentVisible ? <TypingIndicator /> : null}
          </div>
        </main>
      </DynamicCardHostProvider>
      <footer className={styles.composerBar}>
        {error ? (
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
  return (
    <ChatSessionProvider>
      <HomePageContent />
    </ChatSessionProvider>
  )
}
