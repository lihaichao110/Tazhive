import { XRequest, type SSEOutput, type XRequestOptions } from '@ant-design/x-sdk'

import type { DeepSeekMessage, DeepSeekRequestParams } from './deepSeekProvider'

type ChatRequest = ReturnType<typeof XRequest<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>>
type ChatRequestOptions = XRequestOptions<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>

// 每次发送使用独立 SDK 请求与回调快照，避免旧请求结束时污染新请求的状态。
export function createChatRequest(
  url: string,
  options: ChatRequestOptions,
  onSlowChange?: (isSlow: boolean) => void,
): ChatRequest {
  let active: { request: ChatRequest; cancel: () => void } | undefined
  let pending = false
  const facade: ChatRequest = {
    baseURL: url,
    options,
    get asyncHandler() {
      return active?.request.asyncHandler ?? Promise.resolve()
    },
    get isRequesting() {
      return pending
    },
    get isTimeout() {
      return false
    },
    get isStreamTimeout() {
      return false
    },
    get manual() {
      return true
    },
    abort() {
      active?.cancel()
    },
    run(params) {
      active?.cancel()
      const callbacks = facade.options.callbacks
      let finished = false
      let timer: ReturnType<typeof setTimeout>
      // 等待提示不是失败；每次收到分片后重新计算空闲时间。
      const waitForProgress = (): void => {
        clearTimeout(timer)
        onSlowChange?.(false)
        timer = setTimeout(() => onSlowChange?.(true), 30_000)
      }
      const finish = (): void => {
        finished = true
        pending = false
        clearTimeout(timer)
        onSlowChange?.(false)
      }
      const fail: NonNullable<ChatRequestOptions['callbacks']>['onError'] = (...args) => {
        if (finished) return
        finish()
        callbacks?.onError(...args)
      }
      const request = XRequest<DeepSeekRequestParams, SSEOutput, DeepSeekMessage>(url, {
        ...facade.options,
        manual: true,
        timeout: 0,
        streamTimeout: 0,
        retryInterval: 0,
        callbacks: {
          onUpdate: (...args) => {
            if (finished) return
            waitForProgress()
            callbacks?.onUpdate?.(...args)
          },
          onSuccess: (...args) => {
            if (finished) return
            // 消息转换仍可能抛业务错误，必须先转换，再提交成功终态。
            callbacks?.onSuccess(...args)
            finish()
          },
          onError: fail,
        },
      })
      active = {
        request,
        cancel: () => {
          if (finished) return
          // 主动终结 UI，无需依赖 fetch 或流是否及时响应 AbortSignal。
          fail(new DOMException('已停止生成。', 'AbortError'))
          request.abort()
        },
      }
      pending = true
      waitForProgress()
      request.run(params)
    },
  }
  return facade
}
