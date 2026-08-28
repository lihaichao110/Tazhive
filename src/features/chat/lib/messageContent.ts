import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

import { INSURANCE_CATALOG_ID } from '../model/insuranceCard'
import type { ChatMessageContent, DynamicCardMessageContent } from '../model/types'

// 只识别带换行且已闭合的结构化围栏，流式阶段的半包仍按普通文本展示。
const STRUCTURED_FENCE_PATTERN = /```[\t ]*(mermaid|a2ui)[\t ]*\r?\n([\s\S]*?)```/gi
const THINK_OPEN_PATTERN = /^(?:\r?\n){0,2}<think(?:\s+status=["']done["'])?\s*>/i
const THINK_CLOSE_TAG = '</think>'
const CARD_LOAD_ERROR = '表单暂时无法加载，请稍后重试。'
const ALLOWED_INSURANCE_COMPONENTS = new Set([
  'InsuranceForm',
  'Text',
  'TextField',
  'DateField',
  'GenderField',
  'SubmitButton',
])

// 空字符串不生成内容块，防止页面渲染无意义的空段落。
function toTextContent(text: string): ChatMessageContent[] {
  return text ? [{ type: 'text', text }] : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAllowedComponent(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.component === 'string' &&
    ALLOWED_INSURANCE_COMPONENTS.has(value.component)
  )
}

// 每条命令只能包含一种操作，且只能作用于当前消息声明的 Surface。
function isValidCardCommand(command: unknown, surfaceId: string): boolean {
  if (!isRecord(command) || command.version !== 'v0.9') return false
  const commandKeys = [
    'createSurface',
    'updateComponents',
    'updateDataModel',
    'deleteSurface',
  ].filter((key) => key in command)
  if (commandKeys.length !== 1) return false

  const commandKey = commandKeys[0]
  if (!commandKey) return false
  const payload = command[commandKey]
  if (!isRecord(payload) || payload.surfaceId !== surfaceId) return false
  if (commandKey === 'createSurface') return payload.catalogId === INSURANCE_CATALOG_ID
  if (commandKey === 'updateComponents') {
    return Array.isArray(payload.components) && payload.components.every(isAllowedComponent)
  }
  if (commandKey === 'updateDataModel') return typeof payload.path === 'string'
  return true
}

// 校验表单消息的协议版本、Surface 归属和组件白名单，阻止任意组件注入。
function parseDynamicCard(source: string): DynamicCardMessageContent | null {
  try {
    const envelope: unknown = JSON.parse(source)
    if (!isRecord(envelope) || typeof envelope.surfaceId !== 'string' || !envelope.surfaceId) {
      return null
    }
    const surfaceId = envelope.surfaceId
    if (!Array.isArray(envelope.commands) || envelope.commands.length === 0) return null
    if (!envelope.commands.every((command) => isValidCardCommand(command, surfaceId))) {
      return null
    }

    return {
      type: 'dynamic-card',
      surfaceId,
      commands: envelope.commands as XAgentCommand_v0_9[],
    }
  } catch {
    return null
  }
}

// 按原始顺序将普通回复拆成文本、Mermaid 与受控 A2UI 卡片。
function parseAnswerContent(rawContent: string): ChatMessageContent[] {
  const content: ChatMessageContent[] = []
  let textStart = 0

  for (const match of rawContent.matchAll(STRUCTURED_FENCE_PATTERN)) {
    const matchIndex = match.index
    const language = match[1]?.toLowerCase()
    const source = match[2]?.trim()
    // 空图表不推进游标，使该围栏最终仍按原始文本展示。
    if (matchIndex === undefined || !source) continue

    const precedingText = rawContent.slice(textStart, matchIndex)
    if (precedingText) content.push({ type: 'text', text: precedingText })
    if (language === 'mermaid') {
      content.push({ type: 'mermaid', source })
    } else {
      const card = parseDynamicCard(source)
      content.push(card ?? { type: 'dynamic-card-error', message: CARD_LOAD_ERROR })
    }
    textStart = matchIndex + match[0].length
  }

  const trailingText = rawContent.slice(textStart)
  if (trailingText) content.push({ type: 'text', text: trailingText })
  return content
}

// 去除 DeepSeek Provider 为分隔协议标签额外插入的换行，不改写实际思考文本。
function trimProtocolLineBreaks(text: string): string {
  return text.replace(/^(?:\r?\n){0,2}/, '').replace(/(?:\r?\n){0,2}$/, '')
}

// 将 DeepSeek 的 think 协议段转换为领域内容块，再解析思考后的正常回答。
export function parseAssistantMessageContent(rawContent: string): readonly ChatMessageContent[] {
  const openMatch = THINK_OPEN_PATTERN.exec(rawContent)
  if (!openMatch || openMatch.index === undefined) return parseAnswerContent(rawContent)

  const content: ChatMessageContent[] = []
  const precedingText = rawContent.slice(0, openMatch.index)
  // SDK 会在 think 标签前插入空行；只有存在真实内容时才保留并解析。
  if (precedingText.trim()) content.push(...parseAnswerContent(precedingText))

  const thinkStart = openMatch.index + openMatch[0].length
  const closeIndex = rawContent.indexOf(THINK_CLOSE_TAG, thinkStart)
  const completed = closeIndex >= 0
  const thinkingText = trimProtocolLineBreaks(
    rawContent.slice(thinkStart, completed ? closeIndex : rawContent.length),
  )
  content.push({ type: 'thinking', text: thinkingText, completed })

  if (completed) {
    const answerStart = closeIndex + THINK_CLOSE_TAG.length
    const answerText = rawContent.slice(answerStart).replace(/^(?:\r?\n){0,2}/, '')
    content.push(...parseAnswerContent(answerText))
  }

  return content
}

// 用户输入始终视为纯文本，不解析其中的 Mermaid 围栏。
export function createTextMessageContent(text: string): readonly ChatMessageContent[] {
  return toTextContent(text)
}

// 将领域内容块还原为 SDK 接受的字符串协议，用于初始化和请求上下文传递。
export function serializeMessageContent(content: readonly ChatMessageContent[]): string {
  return content
    .map((block) => {
      switch (block.type) {
        case 'text':
          return block.text
        case 'thinking':
          return `<think${block.completed ? ' status="done"' : ''}>\n\n${block.text}${
            block.completed ? '\n\n</think>' : ''
          }`
        case 'mermaid':
          return `\`\`\`mermaid\n${block.source}\n\`\`\``
        case 'dynamic-card':
          return `\`\`\`a2ui\n${JSON.stringify({
            surfaceId: block.surfaceId,
            commands: block.commands,
          })}\n\`\`\``
        case 'dynamic-card-error':
          return block.message
      }
    })
    .join('')
}
