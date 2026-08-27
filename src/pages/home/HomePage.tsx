import { useEffect, useRef, useState } from 'react'

import { ChatHeader } from './components/ChatHeader/ChatHeader'
import { ChatSidebar } from './components/ChatSidebar/ChatSidebar'
import styles from './HomePage.module.scss'

import {
  ChatComposer,
  ChatMessage,
  TypingIndicator,
  useChat,
  type ChatQuote,
} from '@/features/chat'

// 组合聊天页各区域，并协调流式回复、错误提示和自动滚动等页面级行为。
export function HomePage() {
  const { messages, isReplying, error, mode, setMode, send, abort, retry } = useChat()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState('product-roadmap')
  const [quote, setQuote] = useState<ChatQuote | null>(null)
  const scrollAreaRef = useRef<HTMLElement>(null)
  // 流式文本已经可见时不再显示输入动画，避免同时出现两种“正在回复”反馈。
  const isStreamingContentVisible = messages.some(
    (message) =>
      message.role === 'assistant' && message.status === 'updating' && message.content.length > 0,
  )

  // 消息到达时只滚动消息容器，避免影响页面级视口。
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight
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
      <main ref={scrollAreaRef} className={styles.scrollArea} aria-label="对话内容">
        <div className={styles.messageList}>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onRetry={retry}
              onQuoteSelect={setQuote}
            />
          ))}
          {isReplying && !isStreamingContentVisible ? <TypingIndicator /> : null}
        </div>
      </main>
      <footer className={styles.composerBar}>
        {error ? (
          <div className={styles.errorNotice} role="alert">
            {error}
          </div>
        ) : null}
        <div className={styles.composerWrap}>
          <ChatComposer
            isReplying={isReplying}
            mode={mode}
            quote={quote}
            onCancel={abort}
            onModeChange={setMode}
            onQuoteClear={() => setQuote(null)}
            onSend={send}
          />
        </div>
      </footer>
    </div>
  )
}
