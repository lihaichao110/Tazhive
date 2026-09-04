import { ChatUpstreamError } from '../api/deepSeekProvider'

import { HttpError } from '@/shared/api'

// 上游超时文案（如 "Operation timed out"）需要映射为可操作的中文提示。
const UPSTREAM_TIMEOUT_PATTERN = /timed?\s*out|timeout/i

/**
 * 将底层请求错误收敛为用户可理解且可操作的提示。
 * 覆盖：登录失效、限流、SDK 超时、后端 200 载荷内嵌 error 等场景。
 */
export function formatRequestError(error: Error): string {
  if (error instanceof ChatUpstreamError) {
    return UPSTREAM_TIMEOUT_PATTERN.test(error.message)
      ? 'AI 服务响应超时，请重试。'
      : `AI 服务异常：${error.message}`
  }
  if (error instanceof HttpError && error.status === 401) return error.message
  if (error.message.includes('401')) return '登录状态已失效，请重新登录'
  if (error.message.includes('429')) return 'DeepSeek 请求过于频繁，请稍后重试。'
  if (error.message.includes('Timeout')) return 'DeepSeek 响应超时，请重试。'
  return `DeepSeek 请求失败：${error.message}`
}
