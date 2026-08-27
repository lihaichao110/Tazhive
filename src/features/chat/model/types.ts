export type ChatRole = 'user' | 'assistant'

export type ChatMode = 'fast' | 'deep'

export type ChatMessageStatus = 'local' | 'loading' | 'updating' | 'success' | 'error' | 'abort'

export interface ChatQuote {
  readonly messageId: string
  readonly role: ChatRole
  readonly text: string
}

export interface TextMessageContent {
  readonly type: 'text'
  readonly text: string
}

export interface ThinkingMessageContent {
  readonly type: 'thinking'
  readonly text: string
  readonly completed: boolean
}

export interface MermaidMessageContent {
  readonly type: 'mermaid'
  readonly source: string
}

export type ChatMessageContent = TextMessageContent | ThinkingMessageContent | MermaidMessageContent

export interface ChatMessage {
  readonly id: string
  readonly role: ChatRole
  readonly content: readonly ChatMessageContent[]
  readonly status: ChatMessageStatus
  readonly quote?: ChatQuote
}
