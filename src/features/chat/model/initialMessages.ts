import type { ChatMessage } from './types'

// 示例对话照抄参考稿文案（含“meimaid”原文拼写，刻意保留以贴近参考图）。
export const INITIAL_MESSAGES: readonly ChatMessage[] = [
  { id: 'msg-1', role: 'user', content: '你好' },
  { id: 'msg-2', role: 'assistant', content: '你好😊，有什么可以帮你的吗？' },
  { id: 'msg-3', role: 'user', content: '给我生成一个 meimaid 图' },
  { id: 'msg-4', role: 'assistant', content: '游客模式暂不支持生成图片和视频，请登录后再试' },
  { id: 'msg-5', role: 'user', content: 'md 数据渲染的就好了' },
]
