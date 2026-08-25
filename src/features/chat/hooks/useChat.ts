import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useXChat, type DefaultMessageInfo, type MessageInfo } from '@ant-design/x-sdk'

import {
  createDeepSeekProvider,
  type DeepSeekMessage,
  type DeepSeekRequestParams,
} from '../api/deepSeekProvider'
import {
  createTextMessageContent,
  parseAssistantMessageContent,
  serializeMessageContent,
} from '../lib/messageContent'
import { INITIAL_MESSAGES } from '../model/initialMessages'
import type { ChatMessage, ChatMessageStatus } from '../model/types'

import { readDeepSeekConfig } from '@/shared/config'

const DEEPSEEK_CONFIG_RESULT = readDeepSeekConfig()

// SDK 默认消息仍使用字符串协议，进入展示层后再转换为结构化内容块。
const DEFAULT_MESSAGES: DefaultMessageInfo<DeepSeekMessage>[] = INITIAL_MESSAGES.map((message) => ({
  id: message.id,
  message: { role: message.role, content: serializeMessageContent(message.content) },
  status: message.status,
}))

// 将底层请求错误收敛为用户可理解且可操作的提示。
function formatRequestError(error: Error): string {
  if (error.message.includes('401')) return 'DeepSeek 鉴权失败，请检查 API Key。'
  if (error.message.includes('429')) return 'DeepSeek 请求过于频繁，请稍后重试。'
  if (error.message.includes('Timeout')) return 'DeepSeek 响应超时，请重试。'
  return `DeepSeek 请求失败：${error.message}`
}

// 隔离 SDK 消息结构与页面领域模型，只有助手消息需要解析 Mermaid 内容块。
function toChatMessage(info: MessageInfo<DeepSeekMessage>): ChatMessage {
  return {
    id: String(info.id),
    role: info.message.role,
    content:
      info.message.role === 'assistant'
        ? parseAssistantMessageContent(info.message.content)
        : createTextMessageContent(info.message.content),
    status: info.status as ChatMessageStatus,
  }
}

// 负责 DeepSeek 会话的发送、流式状态、终止与失败重试，并向页面暴露稳定的领域模型。
export function useChat() {
  const [requestError, setRequestError] = useState<string | null>(null)
  // ref 在同一事件循环内立即生效，避免连续提交绕过 React 异步状态更新。
  const requestInFlightRef = useRef(false)
  const config = DEEPSEEK_CONFIG_RESULT.config

  const handleRequestError = useCallback((error: Error) => {
    requestInFlightRef.current = false
    if (error.name !== 'AbortError') setRequestError(formatRequestError(error))
  }, [])

  const handleRequestSuccess = useCallback(() => {
    requestInFlightRef.current = false
    setRequestError(null)
  }, [])

  const provider = useMemo(
    () =>
      config
        ? createDeepSeekProvider(config, {
            onError: handleRequestError,
            onSuccess: handleRequestSuccess,
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

  useEffect(() => {
    // SDK 状态是最终事实来源；回调中的同步写入只用于封住提交瞬间的竞态窗口。
    requestInFlightRef.current = isRequesting
  }, [isRequesting])

  const send = useCallback(
    (rawText: string): boolean => {
      const content = rawText.trim()
      if (!content || requestInFlightRef.current) return false
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
      onRequest({ messages: [{ role: 'user', content }] })
      return true
    },
    [onRequest, provider, setMessages],
  )

  const abort = useCallback(() => {
    if (requestInFlightRef.current) abortRequest()
  }, [abortRequest])

  const retry = useCallback(
    (messageId: string): void => {
      if (requestInFlightRef.current || !provider) return

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
      onRequest({ messages: [{ role: 'user', content }] })
    },
    [onRequest, provider, sdkMessages, setMessages],
  )

  return {
    messages: sdkMessages.map(toChatMessage),
    isReplying: isRequesting,
    error: requestError ?? DEEPSEEK_CONFIG_RESULT.error,
    send,
    abort,
    retry,
  }
}
