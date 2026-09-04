import {
  DeepSeekChatProvider,
  XRequest,
  type SSEOutput,
  type TransformMessage,
  type XRequestOptions,
  type XModelMessage,
  type XModelParams,
} from '@ant-design/x-sdk'

import { serializeQuotedPrompt } from '../lib/quoteMessage'
import type { DeepSeekThinkingConfig } from '../model/chatMode'
import type { ChatQuote, ChatRole } from '../model/types'

import type { DeepSeekConfig } from '@/shared/config'
import { getAccessToken, HttpError, reportAccessTokenRejected } from '@/shared/api'

export interface DeepSeekMessage extends XModelMessage {
  readonly role: ChatRole
  readonly content: string
  readonly quote?: ChatQuote
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
      messages: params.messages?.map(({ content, quote, role }) => ({
        role,
        content: serializeQuotedPrompt(content, quote),
      })),
    }
  }

  override transformMessage(info: TransformMessage<DeepSeekMessage, SSEOutput>): DeepSeekMessage {
    // SDK 基类只消费 choices[].delta，会把 200 载荷里的 error 字段静默吞成空回复；
    // 必须在此拦截并抛错，让错误沿 onUpdate 的调用链进入 onError，
    // 从而触发失败气泡、重试按钮与页面横幅，而不是展示一条"成功的"空消息。
    const upstreamMessage = readUpstreamErrorMessage(info.chunk, info.responseHeaders)
    if (upstreamMessage) throw new ChatUpstreamError(upstreamMessage)
    return super.transformMessage(info)
  }
}

// 聊天接口以线程 ID 作为路径参数：/api/v1/chat/{threadId}。
const CHAT_ENDPOINT = '/api/v1/chat'

function buildChatUrl(threadId: string): string {
  return `${CHAT_ENDPOINT}/${encodeURIComponent(threadId)}`
}

// 聊天流绕过 Axios 客户端，因此在 fetch 边界动态注入令牌并同步处理会话失效。
// XRequest 的地址在创建时固定，而线程 ID 随每次请求参数传入；
// 必须在这里用当前线程重写地址，否则请求会落到创建时写死的旧线程上（404）。
async function fetchChatStream(
  input: RequestInfo | URL,
  options: XRequestOptions<DeepSeekRequestParams, SSEOutput>,
): Promise<Response> {
  const accessToken = getAccessToken()
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  else headers.delete('Authorization')

  const threadId = options.params?.thread_id
  const requestUrl = threadId ? buildChatUrl(threadId) : input

  const response = await globalThis.fetch(requestUrl, { ...options, headers })
  if (response.status === 401) {
    // 使用本次请求实际携带的令牌，避免延迟响应清除后来建立的新会话。
    reportAccessTokenRejected(accessToken)
    throw new HttpError('登录状态已失效，请重新登录', { status: 401 })
  }
  return response
}

// 将项目配置转换为 X SDK Provider，并把请求生命周期回传给上层 Hook 管理界面状态。
export function createDeepSeekProvider(
  config: DeepSeekConfig,
  callbacks: DeepSeekProviderCallbacks,
): DeepSeekChatProvider<DeepSeekMessage, DeepSeekRequestParams, SSEOutput> {
  // XRequest 只负责传输和流解析；对话消息的组织、重试与错误展示由 useChat 统一处理。
  // 地址仅为兜底基路径，实际请求地址在 fetch 边界按线程 ID 重写。
  const request = XRequest<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>(CHAT_ENDPOINT, {
    manual: true,
    params: {
      model: config.modelName,
      stream: true,
      thinking: { type: 'disabled' },
    },
    fetch: fetchChatStream,
    timeout: 30_000,
    streamTimeout: 30_000,
    callbacks: {
      onError: callbacks.onError,
      onSuccess: callbacks.onSuccess,
    },
  })

  return new QuotedDeepSeekChatProvider({ request })
}
