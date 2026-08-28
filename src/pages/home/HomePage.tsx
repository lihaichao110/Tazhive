import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ChatHeader } from './components/ChatHeader/ChatHeader'
import { ChatSidebar } from './components/ChatSidebar/ChatSidebar'
import { calculateDynamicCardScroll } from './lib/dynamicCardScroll'
import styles from './HomePage.module.scss'

import {
  ChatComposer,
  ChatMessage,
  TypingIndicator,
  useChat,
  type ChatQuote,
  type DynamicCardReadyHandler,
} from '@/features/chat'

interface CardScrollRequest {
  readonly reserveHeight: number
  readonly surfaceId: string
  readonly targetTop: number
}

const DYNAMIC_CARD_TOP_OFFSET = 24

// 组合聊天页各区域，并协调流式回复、错误提示和自动滚动等页面级行为。
export function HomePage() {
  const { messages, isReplying, error, mode, setMode, send, abort, retry, submitInsurance } =
    useChat()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState('product-roadmap')
  const [quote, setQuote] = useState<ChatQuote | null>(null)
  const [cardScrollRequest, setCardScrollRequest] = useState<CardScrollRequest | null>(null)
  const scrollAreaRef = useRef<HTMLElement>(null)
  const handledSurfaceIdsRef = useRef(new Set<string>())
  // 流式文本已经可见时不再显示输入动画，避免同时出现两种“正在回复”反馈。
  const isStreamingContentVisible = messages.some(
    (message) =>
      message.role === 'assistant' && message.status === 'updating' && message.content.length > 0,
  )
  const latestMessageHasDynamicCard =
    messages.at(-1)?.content.some((content) => content.type === 'dynamic-card') ?? false

  // 新卡片仅定位一次；尾部空间按实际滚动范围补足，避免末条消息无法对齐顶部。
  const handleDynamicCardReady = useCallback<DynamicCardReadyHandler>((surfaceId, element) => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea || handledSurfaceIdsRef.current.has(surfaceId)) return

    handledSurfaceIdsRef.current.add(surfaceId)
    const areaRect = scrollArea.getBoundingClientRect()
    const cardRect = element.getBoundingClientRect()
    const position = calculateDynamicCardScroll({
      areaTop: areaRect.top,
      cardTop: cardRect.top,
      clientHeight: scrollArea.clientHeight,
      currentScrollTop: scrollArea.scrollTop,
      scrollHeight: scrollArea.scrollHeight,
      topOffset: DYNAMIC_CARD_TOP_OFFSET,
    })
    setCardScrollRequest({ surfaceId, ...position })
  }, [])

  // 先渲染所需的尾部空间，再执行平滑滚动，确保浏览器不会截断目标位置。
  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea || !cardScrollRequest) return
    scrollArea.scrollTo({ top: cardScrollRequest.targetTop, behavior: 'smooth' })
  }, [cardScrollRequest])

  // 普通消息继续滚到底部；动态卡片交由就绪回调定位，防止两种策略互相覆盖。
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea || latestMessageHasDynamicCard) return
    setCardScrollRequest(null)
    scrollArea.scrollTop = scrollArea.scrollHeight
  }, [messages, isReplying, latestMessageHasDynamicCard])

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
              onDynamicCardReady={handleDynamicCardReady}
              onInsuranceSubmit={submitInsurance}
              onRetry={retry}
              onQuoteSelect={setQuote}
            />
          ))}
          {isReplying && !isStreamingContentVisible ? <TypingIndicator /> : null}
        </div>
        {latestMessageHasDynamicCard && cardScrollRequest ? (
          <div
            className={styles.dynamicCardScrollReserve}
            style={{ height: cardScrollRequest.reserveHeight }}
            aria-hidden
          />
        ) : null}
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
