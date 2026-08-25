import { describe, expect, it } from 'vitest'

import { toDeepSeekThinking } from './chatMode'

describe('chatMode', () => {
  it('快速模式关闭 DeepSeek thinking', () => {
    expect(toDeepSeekThinking('fast')).toEqual({ type: 'disabled' })
  })

  it('深度思考模式开启 DeepSeek thinking', () => {
    expect(toDeepSeekThinking('deep')).toEqual({ type: 'enabled' })
  })
})
