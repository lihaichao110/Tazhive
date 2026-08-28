import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

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

export interface DynamicCardMessageContent {
  readonly type: 'dynamic-card'
  readonly surfaceId: string
  readonly commands: readonly XAgentCommand_v0_9[]
}

export interface DynamicCardErrorMessageContent {
  readonly type: 'dynamic-card-error'
  readonly message: string
}

export interface InsuranceSubmission {
  readonly name: string
  readonly birthDate: string
  readonly gender: 'male' | 'female'
  readonly phone: string
}

export type DynamicCardReadyHandler = (surfaceId: string, element: HTMLElement) => void

export type ChatMessageContent =
  | TextMessageContent
  | ThinkingMessageContent
  | MermaidMessageContent
  | DynamicCardMessageContent
  | DynamicCardErrorMessageContent

export interface ChatMessage {
  readonly id: string
  readonly role: ChatRole
  readonly content: readonly ChatMessageContent[]
  readonly status: ChatMessageStatus
  readonly quote?: ChatQuote
}
