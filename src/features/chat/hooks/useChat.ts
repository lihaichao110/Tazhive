import { useCallback, useRef, useState } from 'react'

import type { ChatMessage } from '../model/types'
import { INITIAL_MESSAGES } from '../model/initialMessages'
import { MOCK_REPLY_DELAY_MS, buildMockReply } from '../model/mockReplies'

// 模块级自增序号，保证 mock 消息 id 稳定唯一。
let messageSequence = 0
function createMessageId(prefix: string): string {
  messageSequence += 1
  return `${prefix}-${messageSequence}`
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [...INITIAL_MESSAGES])
  const [isReplying, setIsReplying] = useState(false)
  // 用 ref 同步判断回复中状态，避免 setTimeout 闭包读到过期值。
  const isReplyingRef = useRef(false)

  const send = useCallback((rawText: string) => {
    const content = rawText.trim()
    if (!content || isReplyingRef.current) return

    isReplyingRef.current = true
    setMessages((prev) => [...prev, { id: createMessageId('user'), role: 'user', content }])
    setIsReplying(true)

    // mock 回复：延迟后追加固定话术，真实场景应替换为接口调用。
    window.setTimeout(() => {
      isReplyingRef.current = false
      setIsReplying(false)
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: buildMockReply(content),
        },
      ])
    }, MOCK_REPLY_DELAY_MS)
  }, [])

  return { messages, isReplying, send }
}
