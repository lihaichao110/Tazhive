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

export type ResponseChartType = 'pie' | 'bar' | 'line'

export interface ResponseChartDatum {
  readonly name: string
  readonly value: number
}

export interface ResponseChart {
  readonly chartId: string
  readonly type: ResponseChartType
  readonly title: string
  readonly data: readonly ResponseChartDatum[]
}

export interface ChartMessageContent {
  readonly type: 'chart'
  readonly chart: ResponseChart
}

export interface ChartErrorMessageContent {
  readonly type: 'chart-error'
  readonly message: string
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

export interface CardActionPayload {
  readonly name: string
  readonly surfaceId: string
  readonly context: Readonly<Record<string, unknown>>
}

export type ChatMessageContent =
  | TextMessageContent
  | ThinkingMessageContent
  | MermaidMessageContent
  | ChartMessageContent
  | ChartErrorMessageContent
  | DynamicCardMessageContent
  | DynamicCardErrorMessageContent

export interface ChatMessage {
  readonly id: string
  readonly role: ChatRole
  readonly content: readonly ChatMessageContent[]
  readonly status: ChatMessageStatus
  readonly quote?: ChatQuote
}
