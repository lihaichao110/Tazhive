import { createContext } from 'react'

import type { CardActionPayload, ChatMessage, ChatMode, ChatQuote } from '../model/types'

export interface ChatSessionValue {
  readonly messages: readonly ChatMessage[]
  readonly isReplying: boolean
  readonly isSlow: boolean
  readonly error: string | null
  readonly isHistoryLoading: boolean
  readonly historyError: string | null
  /** 登录恢复后清除旧会话遗留的错误提示。 */
  readonly clearError: () => void
  readonly mode: ChatMode
  readonly quote: ChatQuote | null
  readonly setMode: (mode: ChatMode) => void
  readonly sendMessage: (text: string) => Promise<boolean>
  readonly abort: () => void
  readonly loadHistory: (threadId: string) => Promise<void>
  readonly retryHistory: () => Promise<void>
  readonly retry: (messageId: string) => void
  readonly submitCardAction: (payload: CardActionPayload) => boolean
  readonly selectQuote: (quote: ChatQuote) => void
  readonly clearQuote: () => void
}

export const ChatSessionContext = createContext<ChatSessionValue | null>(null)
