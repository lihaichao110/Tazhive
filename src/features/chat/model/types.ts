export type ChatRole = 'user' | 'assistant'

export type ChatMessageStatus = 'local' | 'loading' | 'updating' | 'success' | 'error' | 'abort'

export interface ChatMessage {
  readonly id: string
  readonly role: ChatRole
  readonly content: string
  readonly status: ChatMessageStatus
}
