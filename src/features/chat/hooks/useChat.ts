import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useXChat, type DefaultMessageInfo, type MessageInfo } from '@ant-design/x-sdk'

import {
  createDeepSeekProvider,
  type DeepSeekMessage,
  type DeepSeekRequestParams,
} from '../api/deepSeekProvider'
import type { ThreadMessageRead } from '../api/listThreadMessages'
import {
  createTextMessageContent,
  parseAssistantMessageContent,
  serializeMessageContent,
} from '../lib/messageContent'
import {
  formatCardActionSummary,
  parseCardActionMessage,
  serializeCardActionMessage,
} from '../lib/cardActionMessage'
import { formatRequestError } from '../lib/formatRequestError'
import { INITIAL_MESSAGES } from '../model/initialMessages'
import { DEFAULT_CHAT_MODE, toDeepSeekThinking } from '../model/chatMode'
import type { CardActionPayload, ChatMessage, ChatMessageStatus, ChatQuote } from '../model/types'

import { readDeepSeekConfig } from '@/shared/config'

const DEEPSEEK_CONFIG_RESULT = readDeepSeekConfig()

// SDK 默认消息仍使用字符串协议，进入展示层后再转换为结构化内容块。
const DEFAULT_MESSAGES: DefaultMessageInfo<DeepSeekMessage>[] = INITIAL_MESSAGES.map((message) => ({
  id: message.id,
  message: { role: message.role, content: serializeMessageContent(message.content) },
  status: message.status,
}))

// 隔离 SDK 消息结构与页面领域模型，并将持久化的卡片动作恢复为友好摘要。
function toChatMessage(info: MessageInfo<DeepSeekMessage>): ChatMessage {
  const action = info.message.role === 'user' ? parseCardActionMessage(info.message.content) : null
  return {
    id: String(info.id),
    role: info.message.role,
    content:
      info.message.role === 'assistant'
        ? parseAssistantMessageContent(info.message.content, info.status as ChatMessageStatus)
        : createTextMessageContent(action ? formatCardActionSummary(action) : info.message.content),
    status: info.status as ChatMessageStatus,
    quote: info.message.quote,
  }
}

// 负责 DeepSeek 会话的发送、流式状态、终止与失败重试，并向页面暴露稳定的领域模型。
export function useChat() {
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isSlow, setIsSlow] = useState(false)
  const [mode, setMode] = useState(DEFAULT_CHAT_MODE)
  // ref 在同一事件循环内立即生效，避免连续提交绕过 React 异步状态更新。
  const requestInFlightRef = useRef(false)
  const config = DEEPSEEK_CONFIG_RESULT.config

  const handleRequestError = useCallback(() => {
    requestInFlightRef.current = false
    // 请求错误只进入消息气泡，横幅留给无法发起请求的独立错误。
  }, [])

  const handleRequestSuccess = useCallback(() => {
    requestInFlightRef.current = false
    setRequestError(null)
  }, [])

  // 登录成功后，旧会话请求遗留的错误已不再对应当前令牌，应统一清空。
  const clearError = useCallback((): void => {
    setRequestError(null)
  }, [])

  const provider = useMemo(
    () =>
      config
        ? createDeepSeekProvider(config, {
            onError: handleRequestError,
            onSuccess: handleRequestSuccess,
            onSlowChange: setIsSlow,
          })
        : undefined,
    [config, handleRequestError, handleRequestSuccess],
  )

  const {
    messages: sdkMessages,
    isRequesting,
    onRequest,
    setMessages,
    abort: abortRequest,
  } = useXChat<DeepSeekMessage, DeepSeekMessage, DeepSeekRequestParams>({
    provider,
    defaultMessages: DEFAULT_MESSAGES,
    requestPlaceholder: { role: 'assistant', content: '' },
    requestFallback: (_requestParams, { error }) => ({
      role: 'assistant',
      content:
        error.name === 'AbortError'
          ? '已停止生成。'
          : `${formatRequestError(error)} 你可以点击下方按钮重试。`,
    }),
  })

  // 卸载时取消当前传输，防止后台请求和等待计时器遗留。
  useEffect(() => () => provider?.request.abort(), [provider])

  useEffect(() => {
    // SDK 状态是最终事实来源；回调中的同步写入只用于封住提交瞬间的竞态窗口。
    requestInFlightRef.current = isRequesting
  }, [isRequesting])

  // threadId 是消息归属的服务端线程，新会话首条消息由上层先建线程后传入。
  const requestMessage = useCallback(
    (message: DeepSeekMessage, threadId: string): boolean => {
      if (requestInFlightRef.current || !threadId) return false
      if (!provider) {
        setRequestError(DEEPSEEK_CONFIG_RESULT.error)
        return false
      }

      requestInFlightRef.current = true
      setRequestError(null)
      // 新请求开始前移除不可继续展示的失败占位，保留成功的历史上下文。
      setMessages((current) =>
        current.filter((info) => info.status !== 'error' && info.status !== 'abort'),
      )
      onRequest({
        messages: [message],
        thinking: toDeepSeekThinking(mode),
        thread_id: threadId,
      })
      return true
    },
    [mode, onRequest, provider, setMessages],
  )

  const send = useCallback(
    (rawText: string, quote: undefined | ChatQuote, threadId: string): boolean => {
      const content = rawText.trim()
      if (!content || requestInFlightRef.current || !threadId) return false
      return requestMessage({ role: 'user', content, quote }, threadId)
    },
    [requestMessage],
  )

  const submitCardAction = useCallback(
    (payload: CardActionPayload, threadId: string): boolean => {
      const requestContent = serializeCardActionMessage(payload)
      return requestMessage(
        {
          role: 'user',
          content: formatCardActionSummary(payload),
          requestContent,
        },
        threadId,
      )
    },
    [requestMessage],
  )

  const abort = useCallback(() => {
    if (requestInFlightRef.current) abortRequest()
  }, [abortRequest])

  // 用服务端历史整体替换 SDK 消息；空数组必须保留为空，不能恢复新会话欢迎语。
  const replaceHistory = useCallback(
    (history: readonly ThreadMessageRead[]): void => {
      setMessages(
        history.map((item) => ({
          id: item.id,
          message: { role: item.role, content: item.content },
          status: 'success',
        })),
      )
    },
    [setMessages],
  )

  // 确定性业务接口返回的消息已经由服务端落库，直接追加即可保持实时与历史同形。
  const appendHistoryMessages = useCallback(
    (history: readonly ThreadMessageRead[]): void => {
      setMessages((current) => {
        const existingIds = new Set(current.map((item) => String(item.id)))
        return [
          ...current,
          ...history
            .filter((item) => !existingIds.has(item.id))
            .map((item) => ({
              id: item.id,
              message: { role: item.role, content: item.content },
              status: 'success' as const,
            })),
        ]
      })
    },
    [setMessages],
  )

  // 切换历史会话时立即移除上一会话，避免加载期间误读旧内容。
  const clearMessages = useCallback((): void => {
    setMessages([])
  }, [setMessages])

  const retry = useCallback(
    (messageId: string, threadId: string): void => {
      if (requestInFlightRef.current || !provider || !threadId) return

      const failedIndex = sdkMessages.findIndex((info) => String(info.id) === messageId)
      // SDK 重试会重新插入用户消息，因此需要先找到失败回答对应的最近一次用户输入。
      const previousUser = sdkMessages
        .slice(0, failedIndex)
        .reverse()
        .find((info) => info.message.role === 'user')
      if (failedIndex < 0 || !previousUser) return

      const content = previousUser.message.content.trim()
      // 同时移除失败回答和原用户消息，避免重试后出现重复提问。
      setMessages((current) =>
        current.filter(
          (info) => info.id !== sdkMessages[failedIndex]?.id && info.id !== previousUser.id,
        ),
      )
      requestInFlightRef.current = true
      setRequestError(null)
      onRequest({
        messages: [
          {
            role: 'user',
            content,
            quote: previousUser.message.quote,
            requestContent: previousUser.message.requestContent,
          },
        ],
        thinking: toDeepSeekThinking(mode),
        thread_id: threadId,
      })
    },
    [mode, onRequest, provider, sdkMessages, setMessages],
  )

  return {
    messages: sdkMessages.map(toChatMessage),
    isReplying: isRequesting,
    isSlow,
    error: requestError ?? DEEPSEEK_CONFIG_RESULT.error,
    clearError,
    mode,
    setMode,
    send,
    abort,
    clearMessages,
    replaceHistory,
    appendHistoryMessages,
    retry,
    submitCardAction,
  }
}
