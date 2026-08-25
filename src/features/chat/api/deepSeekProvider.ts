import {
  DeepSeekChatProvider,
  XRequest,
  type SSEOutput,
  type XModelMessage,
  type XModelParams,
} from '@ant-design/x-sdk'

import type { ChatRole } from '../model/types'

import type { DeepSeekConfig } from '@/shared/config'

export interface DeepSeekMessage extends XModelMessage {
  readonly role: ChatRole
  readonly content: string
}

export interface DeepSeekRequestParams extends XModelParams {
  readonly messages?: DeepSeekMessage[]
  readonly thinking?: { readonly type: 'disabled' }
}

interface DeepSeekProviderCallbacks {
  readonly onError: (error: Error) => void
  readonly onSuccess: () => void
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

  return new DeepSeekChatProvider({ request })
}
