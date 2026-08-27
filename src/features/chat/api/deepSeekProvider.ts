import {
  DeepSeekChatProvider,
  XRequest,
  type SSEOutput,
  type XRequestOptions,
  type XModelMessage,
  type XModelParams,
} from '@ant-design/x-sdk'

import { serializeQuotedPrompt } from '../lib/quoteMessage'
import type { DeepSeekThinkingConfig } from '../model/chatMode'
import type { ChatQuote, ChatRole } from '../model/types'

import type { DeepSeekConfig } from '@/shared/config'

export interface DeepSeekMessage extends XModelMessage {
  readonly role: ChatRole
  readonly content: string
  readonly quote?: ChatQuote
}

export interface DeepSeekRequestParams extends XModelParams {
  readonly messages?: DeepSeekMessage[]
  readonly thinking?: DeepSeekThinkingConfig
}

interface DeepSeekProviderCallbacks {
  readonly onError: (error: Error) => void
  readonly onSuccess: () => void
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
}

// 统一在适配层拼接接口路径，允许环境变量同时使用带或不带尾斜杠的 Base URL。
function buildCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

// 将项目配置转换为 X SDK Provider，并把请求生命周期回传给上层 Hook 管理界面状态。
export function createDeepSeekProvider(
  config: DeepSeekConfig,
  callbacks: DeepSeekProviderCallbacks,
): DeepSeekChatProvider<DeepSeekMessage, DeepSeekRequestParams, SSEOutput> {
  // XRequest 只负责传输和流解析；对话消息的组织、重试与错误展示由 useChat 统一处理。
  const request = XRequest<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>(
    buildCompletionsUrl(config.baseUrl),
    {
      manual: true,
      params: {
        model: config.modelName,
        stream: true,
        thinking: { type: 'disabled' },
      },
      headers: { Authorization: `Bearer ${config.apiKey}` },
      timeout: 30_000,
      streamTimeout: 30_000,
      callbacks: {
        onError: callbacks.onError,
        onSuccess: callbacks.onSuccess,
      },
    },
  )

  return new QuotedDeepSeekChatProvider({ request })
}
