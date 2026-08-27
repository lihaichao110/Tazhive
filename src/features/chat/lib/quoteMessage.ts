import type { ChatQuote } from '../model/types'

// 将界面引用转换为模型可理解的 Markdown 上下文，引用原文始终完整保留。
export function serializeQuotedPrompt(question: string, quote?: ChatQuote): string {
  if (!quote) return question

  const source = quote.role === 'assistant' ? 'AI 回答' : '用户问题'
  const quotedText = quote.text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n')

  return `引用（来自${source}）：\n\n${quotedText}\n\n我的问题：\n${question}`
}
