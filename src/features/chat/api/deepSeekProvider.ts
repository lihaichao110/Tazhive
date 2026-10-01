import {
  DeepSeekChatProvider,
  type SSEOutput,
  type TransformMessage,
  type XRequestOptions,
  type XModelMessage,
  type XModelParams,
} from '@ant-design/x-sdk'

import { createChatRequest } from './createChatRequest'
import { readChatHttpError } from './readChatHttpError'

import { serializeQuotedPrompt } from '../lib/quoteMessage'
import type { DeepSeekThinkingConfig } from '../model/chatMode'
import { parseChatReferences } from '../model/chatReference'
import type { ChatQuote, ChatReference, ChatRole } from '../model/types'

import {
  getAccessToken,
  HttpError,
  recoverFromAccessTokenRejection,
  reportAccessTokenRejected,
} from '@/shared/api'

export interface DeepSeekMessage extends XModelMessage {
  readonly role: ChatRole
  readonly content: string
  readonly quote?: ChatQuote
  readonly references?: readonly ChatReference[]
  /** 与界面展示正文不同时，使用该字段作为实际发送给模型的正文。 */
  readonly requestContent?: string
}

export interface DeepSeekRequestParams extends XModelParams {
  readonly messages?: DeepSeekMessage[]
  readonly thinking?: DeepSeekThinkingConfig
  /** 本次对话归属的服务端线程 ID，由后端用于关联与持久化消息。 */
  readonly thread_id?: string
}

interface DeepSeekProviderCallbacks {
  readonly onError: (error: Error) => void
  readonly onSuccess: () => void
  readonly onSlowChange?: (isSlow: boolean) => void
}

/** 后端在 HTTP 200 载荷（SSE data 或 JSON 体）中携带的业务级错误，原文保留以便诊断。 */
export class ChatUpstreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChatUpstreamError'
  }
}

// 从响应分片中提取后端 error 文案，兼容字符串与 { message } 对象两种形态；无错误载荷返回 null。
function readUpstreamErrorMessage(
  chunk: SSEOutput | undefined,
  responseHeaders: Headers,
): string | null {
  let payload: unknown
  if (responseHeaders.get('content-type')?.includes('text/event-stream')) {
    const data = chunk?.data
    if (typeof data !== 'string') return null
    const trimmed = data.trim()
    if (trimmed === '' || trimmed === '[DONE]') return null
    try {
      payload = JSON.parse(trimmed)
    } catch {
      // 非 JSON 载荷交回基类原逻辑处理，避免破坏既有解析行为。
      return null
    }
  } else {
    payload = chunk
  }

  if (!payload || typeof payload !== 'object') return null
  const error = (payload as { readonly error?: unknown }).error
  if (typeof error === 'string' && error.trim() !== '') return error
  if (error !== null && typeof error === 'object') {
    const message = (error as { readonly message?: unknown }).message
    if (typeof message === 'string' && message.trim() !== '') return message
  }
  return null
}

// 请求边界只发送 DeepSeek 支持的字段，并把本地引用元数据编码进消息正文。
class QuotedDeepSeekChatProvider extends DeepSeekChatProvider<
  DeepSeekMessage,
  DeepSeekRequestParams,
  SSEOutput
> {
  override transformParams(
    requestParams: Partial<DeepSeekRequestParams>,
    options: XRequestOptions<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>,
  ): DeepSeekRequestParams {
    const params = super.transformParams(requestParams, options)
    return {
      ...params,
      messages: params.messages?.map(({ content, quote, requestContent, role }) => ({
        role,
        content: requestContent ?? serializeQuotedPrompt(content, quote),
      })),
    }
  }

  override transformMessage(info: TransformMessage<DeepSeekMessage, SSEOutput>): DeepSeekMessage {
    // SDK 基类只消费 choices[].delta，会把 200 载荷里的 error 字段静默吞成空回复；
    // 必须在此拦截并抛错，让错误沿 onUpdate 的调用链进入 onError，
    // 从而触发失败气泡与重试按钮，而不是展示一条"成功的"空消息。
    const upstreamMessage = readUpstreamErrorMessage(info.chunk, info.responseHeaders)
    if (upstreamMessage) throw new ChatUpstreamError(upstreamMessage)
    const transformedMessage = super.transformMessage(info)
    // SDK 基类只合并标准字段，需显式把上一帧的来源元数据带入当前消息。
    const message = info.originMessage?.references
      ? { ...transformedMessage, references: info.originMessage.references }
      : transformedMessage
    const data = info.chunk?.data
    if (typeof data !== 'string') return message
    const trimmed = data.trim()
    if (trimmed === '' || trimmed === '[DONE]') return message

    let payload: unknown
    try {
      payload = JSON.parse(trimmed)
    } catch {
      return message
    }
    if (typeof payload !== 'object' || payload === null || !('references' in payload))
      return message
    const rawReferences = (payload as Record<string, unknown>).references
    const references = parseChatReferences(rawReferences)
    // 明确的空数组代表无来源；非空数组若全部非法则忽略，避免破坏前一帧的有效来源。
    if (
      references === null ||
      (Array.isArray(rawReferences) && rawReferences.length > 0 && references.length === 0)
    ) {
      return message
    }
    return { ...message, references }
  }
}

// 聊天接口以线程 ID 作为路径参数：/api/v1/chat/{threadId}。
const CHAT_ENDPOINT = '/api/v1/chat'

function buildChatUrl(threadId: string): string {
  return `${CHAT_ENDPOINT}/${encodeURIComponent(threadId)}`
}

// 按传入令牌注入鉴权头并发送一次聊天请求；令牌在每次发送前确定。
async function sendAuthorizedChatRequest(
  requestUrl: RequestInfo | URL,
  options: XRequestOptions<DeepSeekRequestParams, SSEOutput>,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  else headers.delete('Authorization')
  return globalThis.fetch(requestUrl, { ...options, headers })
}

// 聊天流绕过 Axios 客户端，因此在 fetch 边界动态注入令牌并同步处理会话失效。
// XRequest 的地址在创建时固定，而线程 ID 随每次请求参数传入；
// 必须在这里用当前线程重写地址，否则请求会落到创建时写死的旧线程上（404）。
async function fetchChatStream(
  input: RequestInfo | URL,
  options: XRequestOptions<DeepSeekRequestParams, SSEOutput>,
): Promise<Response> {
  const threadId = options.params?.thread_id
  const requestUrl = threadId ? buildChatUrl(threadId) : input

  let usedToken = getAccessToken()
  let response = await sendAuthorizedChatRequest(requestUrl, options, usedToken)
  // SSE 通道与 axios 拦截器一致：先静默刷新并以新令牌原样重发一次。
  let isRetryAfterRefresh = false
  if (response.status === 401 && usedToken) {
    const recoveredToken = await recoverFromAccessTokenRejection(usedToken)
    if (recoveredToken) {
      isRetryAfterRefresh = true
      usedToken = recoveredToken
      response = await sendAuthorizedChatRequest(requestUrl, options, usedToken)
    }
  }

  // 已取消的旧请求不得触发登录失效或处理迟到的后端响应。
  options.signal?.throwIfAborted()
  if (response.status === 401) {
    // 首次 401 的拒绝上报已由恢复入口完成；此处只兜底重发后仍未通过的情形，
    // 并使用本次请求实际携带的令牌，避免延迟响应清除后来建立的新会话。
    if (isRetryAfterRefresh) reportAccessTokenRejected(usedToken)
    throw new HttpError('登录状态已失效，请重新登录', { status: 401 })
  }
  if (!response.ok) throw await readChatHttpError(response)
  return response
}

// 使用前端选定的公开模型名称创建 Provider，密钥与上游地址由后端管理。
export function createDeepSeekProvider(
  modelName: string,
  callbacks: DeepSeekProviderCallbacks,
): DeepSeekChatProvider<DeepSeekMessage, DeepSeekRequestParams, SSEOutput> {
  // XRequest 只负责传输和流解析；对话消息的组织、重试与错误展示由 useChat 统一处理。
  // 地址仅为兜底基路径，实际请求地址在 fetch 边界按线程 ID 重写。
  const request = createChatRequest(
    CHAT_ENDPOINT,
    {
      manual: true,
      params: {
        model: modelName,
        stream: true,
        thinking: { type: 'disabled' },
      },
      fetch: fetchChatStream,
      callbacks: {
        onError: callbacks.onError,
        onSuccess: callbacks.onSuccess,
      },
    },
    callbacks.onSlowChange,
  )

  return new QuotedDeepSeekChatProvider({ request })
}
