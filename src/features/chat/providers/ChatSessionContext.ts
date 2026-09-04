import { createContext } from 'react'

import type { ChatMessage, ChatMode, ChatQuote, InsuranceSubmission } from '../model/types'

export interface ChatSessionValue {
  readonly messages: readonly ChatMessage[]
  readonly isReplying: boolean
  readonly error: string | null
  readonly mode: ChatMode
  readonly quote: ChatQuote | null
  readonly setMode: (mode: ChatMode) => void
  readonly sendMessage: (text: string) => Promise<boolean>
  readonly abort: () => void
  readonly retry: (messageId: string) => void
  readonly submitInsurance: (submission: InsuranceSubmission) => void
  readonly selectQuote: (quote: ChatQuote) => void
  readonly clearQuote: () => void
}

export const ChatSessionContext = createContext<ChatSessionValue | null>(null)
