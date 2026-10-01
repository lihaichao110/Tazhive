import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_DEEPSEEK_MODEL_NAME, readDeepSeekModelName } from './deepSeekModel'

describe('DeepSeek 模型配置', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('清理自定义模型名称两侧的空白', () => {
    vi.stubEnv('VITE_DEEPSEEK_MODEL_NAME', '  deepseek-chat  ')

    expect(readDeepSeekModelName()).toBe('deepseek-chat')
  })

  it.each([undefined, '', '   '])('配置为 %s 时使用默认模型', (modelName) => {
    vi.stubEnv('VITE_DEEPSEEK_MODEL_NAME', modelName)

    expect(readDeepSeekModelName()).toBe(DEFAULT_DEEPSEEK_MODEL_NAME)
  })
})
