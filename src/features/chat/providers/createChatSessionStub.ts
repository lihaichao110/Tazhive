import type { ChatSessionValue } from './ChatSessionContext'

// 为组件单元测试提供无副作用的会话默认值，仅覆盖当前用例关心的状态或动作。
export function createChatSessionStub(overrides: Partial<ChatSessionValue> = {}): ChatSessionValue {
  return {
    messages: [],
    isReplying: false,
    error: null,
    mode: 'fast',
    quote: null,
    setMode: () => undefined,
    sendMessage: async () => false,
    abort: () => undefined,
    retry: () => undefined,
    submitInsurance: () => undefined,
    selectQuote: () => undefined,
    clearQuote: () => undefined,
    ...overrides,
  }
}
