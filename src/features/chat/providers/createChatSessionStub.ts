import type { ChatSessionValue } from './ChatSessionContext'

// 为组件单元测试提供无副作用的会话默认值，仅覆盖当前用例关心的状态或动作。
export function createChatSessionStub(overrides: Partial<ChatSessionValue> = {}): ChatSessionValue {
  return {
    messages: [],
    isReplying: false,
    isSlow: false,
    error: null,
    isHistoryLoading: false,
    historyError: null,
    clearError: () => undefined,
    mode: 'fast',
    quote: null,
    setMode: () => undefined,
    sendMessage: async () => false,
    abort: () => undefined,
    loadHistory: async () => undefined,
    retryHistory: async () => undefined,
    retry: () => undefined,
    submitCardAction: () => false,
    submitInsuranceAction: async () => {
      throw new Error('测试未配置投保动作')
    },
    selectQuote: () => undefined,
    clearQuote: () => undefined,
    ...overrides,
  }
}
