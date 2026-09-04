import { describe, expect, it } from 'vitest'

import { ChatUpstreamError } from '../api/deepSeekProvider'
import { formatRequestError } from './formatRequestError'

import { HttpError } from '@/shared/api'

describe('formatRequestError', () => {
  it('上游超时错误映射为可操作的超时提示', () => {
    const error = new ChatUpstreamError(
      'consuming input failed: could not receive data from server: Operation timed out',
    )

    expect(formatRequestError(error)).toBe('AI 服务响应超时，请重试。')
  })

  it('上游非超时错误保留后端原文便于诊断', () => {
    expect(formatRequestError(new ChatUpstreamError('model overloaded'))).toBe(
      'AI 服务异常：model overloaded',
    )
  })

  it('登录失效优先展示桥接层文案', () => {
    expect(formatRequestError(new HttpError('登录状态已失效，请重新登录', { status: 401 }))).toBe(
      '登录状态已失效，请重新登录',
    )
    expect(formatRequestError(new Error('Fetch failed with status 401'))).toBe(
      '登录状态已失效，请重新登录',
    )
  })

  it('限流与超时保持原有映射', () => {
    expect(formatRequestError(new Error('Fetch failed with status 429'))).toBe(
      'DeepSeek 请求过于频繁，请稍后重试。',
    )
    expect(formatRequestError(new Error('StreamTimeoutError'))).toBe('DeepSeek 响应超时，请重试。')
  })

  it('未知错误保留原始信息', () => {
    expect(formatRequestError(new Error('network down'))).toBe('DeepSeek 请求失败：network down')
  })
})
