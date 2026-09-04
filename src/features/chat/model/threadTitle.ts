// 首条消息派生会话标题时的最大长度，按用户可读字符计数。
const MAX_TITLE_LENGTH = 20

// 兜底标题：首条消息为空或派生结果为空时使用。
const FALLBACK_TITLE = '新对话'

// 将首条消息压缩为会话标题：折叠空白、截断到最大长度，超长时以省略号结尾。
export function deriveThreadTitle(firstMessage: string): string {
  const normalizedTitle = firstMessage.trim().replace(/\s+/g, ' ')
  if (!normalizedTitle) return FALLBACK_TITLE

  // 按码点截断，避免把 emoji 或扩展字符从中间切断产生乱码。
  const characters = Array.from(normalizedTitle)
  if (characters.length <= MAX_TITLE_LENGTH) return normalizedTitle
  return `${characters.slice(0, MAX_TITLE_LENGTH).join('')}…`
}
