import type { ChatMessage } from './types'

// 首次进入对话时展示的欢迎消息。
export const INITIAL_MESSAGES: readonly ChatMessage[] = [
  {
    id: 'msg-2',
    role: 'assistant',
    content: [{ type: 'text', text: '你好😊，有什么可以帮你的吗？' }],
    status: 'success',
  },
]
