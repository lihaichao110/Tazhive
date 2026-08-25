import type { ChatMode } from './types'

export const DEFAULT_CHAT_MODE: ChatMode = 'fast'

export interface DeepSeekThinkingConfig {
  readonly type: 'enabled' | 'disabled'
}

// 将界面模式收敛为 DeepSeek thinking 参数，供发送与重试共享同一映射规则。
export function toDeepSeekThinking(mode: ChatMode): DeepSeekThinkingConfig {
  return { type: mode === 'deep' ? 'enabled' : 'disabled' }
}
