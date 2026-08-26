import type { ChatMessageContent } from '../model/types'

// 仅识别带换行且已闭合的 Mermaid 围栏，避免把普通行内代码误判为图表。
const MERMAID_FENCE_PATTERN = /```[\t ]*mermaid[\t ]*\r?\n([\s\S]*?)```/gi
const THINK_OPEN_PATTERN = /^(?:\r?\n){0,2}<think(?:\s+status=["']done["'])?\s*>/i
const THINK_CLOSE_TAG = '</think>'

// 空字符串不生成内容块，防止页面渲染无意义的空段落。
function toTextContent(text: string): ChatMessageContent[] {
  return text ? [{ type: 'text', text }] : []
}

// 按原始顺序将普通回复拆成文本与 Mermaid 块。
function parseAnswerContent(rawContent: string): ChatMessageContent[] {
  const content: ChatMessageContent[] = []
  let textStart = 0

  for (const match of rawContent.matchAll(MERMAID_FENCE_PATTERN)) {
    const matchIndex = match.index
    const source = match[1]?.trim()
    // 空图表不推进游标，使该围栏最终仍作为原始文本展示，避免静默吞掉回复内容。
    if (matchIndex === undefined || !source) continue

    const precedingText = rawContent.slice(textStart, matchIndex)
    if (precedingText) content.push({ type: 'text', text: precedingText })
    content.push({ type: 'mermaid', source })
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
      }
    })
    .join('')
}
