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

function buildCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

export function createDeepSeekProvider(
  config: DeepSeekConfig,
  callbacks: DeepSeekProviderCallbacks,
): DeepSeekChatProvider<DeepSeekMessage, DeepSeekRequestParams, SSEOutput> {
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
