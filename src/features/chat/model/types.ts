export type ChatRole = 'user' | 'assistant'

export type ChatMessageStatus = 'local' | 'loading' | 'updating' | 'success' | 'error' | 'abort'

export interface TextMessageContent {
  readonly type: 'text'
  readonly text: string
}

export interface MermaidMessageContent {
  readonly type: 'mermaid'
  readonly source: string
}

export type ChatMessageContent = TextMessageContent | MermaidMessageContent

export interface ChatMessage {
  readonly id: string
  readonly role: ChatRole
  readonly content: readonly ChatMessageContent[]
  readonly status: ChatMessageStatus
}
