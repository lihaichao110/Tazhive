import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useXChat, type DefaultMessageInfo, type MessageInfo } from '@ant-design/x-sdk'

import {
  createDeepSeekProvider,
  type DeepSeekMessage,
  type DeepSeekRequestParams,
} from '../api/deepSeekProvider'
import { INITIAL_MESSAGES } from '../model/initialMessages'
import type { ChatMessage, ChatMessageStatus } from '../model/types'

import { readDeepSeekConfig } from '@/shared/config'

const DEEPSEEK_CONFIG_RESULT = readDeepSeekConfig()

const DEFAULT_MESSAGES: DefaultMessageInfo<DeepSeekMessage>[] = INITIAL_MESSAGES.map((message) => ({
  id: message.id,
  message: { role: message.role, content: message.content },
  status: message.status,
}))

function formatRequestError(error: Error): string {
  if (error.message.includes('401')) return 'DeepSeek 鉴权失败，请检查 API Key。'
  if (error.message.includes('429')) return 'DeepSeek 请求过于频繁，请稍后重试。'
  if (error.message.includes('Timeout')) return 'DeepSeek 响应超时，请重试。'
  return `DeepSeek 请求失败：${error.message}`
}

function toChatMessage(info: MessageInfo<DeepSeekMessage>): ChatMessage {
  return {
    id: String(info.id),
    role: info.message.role,
    content: info.message.content,
    status: info.status as ChatMessageStatus,
  }
}

export function useChat() {
  const [requestError, setRequestError] = useState<string | null>(null)
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
      const previousUser = sdkMessages
        .slice(0, failedIndex)
        .reverse()
        .find((info) => info.message.role === 'user')
      if (failedIndex < 0 || !previousUser) return

      const content = previousUser.message.content.trim()
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
