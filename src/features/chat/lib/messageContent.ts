import type { ChatMessageContent } from '../model/types'

// 仅识别带换行且已闭合的 Mermaid 围栏，避免把普通行内代码误判为图表。
const MERMAID_FENCE_PATTERN = /```[\t ]*mermaid[\t ]*\r?\n([\s\S]*?)```/gi

// 空字符串不生成内容块，防止页面渲染无意义的空段落。
function toTextContent(text: string): readonly ChatMessageContent[] {
  return text ? [{ type: 'text', text }] : []
}

// 按原始顺序将助手回复拆成文本与 Mermaid 块，供展示层选择对应渲染器。
export function parseAssistantMessageContent(rawContent: string): readonly ChatMessageContent[] {
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
        case 'mermaid':
          return `\`\`\`mermaid\n${block.source}\n\`\`\``
      }
    })
    .join('')
}
