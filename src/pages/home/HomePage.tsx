import { useEffect, useRef } from 'react'

import { ChatHeader } from './components/ChatHeader/ChatHeader'
import styles from './HomePage.module.scss'

import { ChatComposer, ChatMessage, MermaidViewer, TypingIndicator, useChat } from '@/features/chat'

export function HomePage() {
  const { messages, isReplying, error, send, abort, retry } = useChat()
  const bottomAnchorRef = useRef<HTMLDivElement>(null)
  const isStreamingContentVisible = messages.some(
    (message) =>
      message.role === 'assistant' && message.status === 'updating' && message.content.length > 0,
  )

  // 首次加载与新消息到达时，滚动到对话区底部展示最新内容。
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isReplying])

  return (
    <div className={styles.chatPage}>
      <ChatHeader />
      <main className={styles.scrollArea} aria-label="对话内容">
        <div className={styles.messageList}>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onRetry={retry} />
          ))}
          {isReplying && !isStreamingContentVisible ? <TypingIndicator /> : null}
          <MermaidViewer />
          <div ref={bottomAnchorRef} aria-hidden="true" />
        </div>
      </main>
      <footer className={styles.composerBar}>
        {error ? (
          <div className={styles.errorNotice} role="alert">
            {error}
          </div>
        ) : null}
        <div className={styles.composerWrap}>
          <ChatComposer isReplying={isReplying} onCancel={abort} onSend={send} />
        </div>
      </footer>
    </div>
  )
}
