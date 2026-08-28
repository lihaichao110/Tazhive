import { describe, expect, it } from 'vitest'

import { createInsuranceCardEnvelope, isInsuranceIntent } from './insuranceCard'

describe('insuranceCard', () => {
  it.each(['我想买保险', '帮我购买保险', '我要投保'])('识别投保意图：%s', (text) => {
    expect(isInsuranceIntent(text)).toBe(true)
  })

  it.each(['解释一下保险原理', '今天天气怎么样', '生成一张表格'])('不拦截普通消息：%s', (text) => {
    expect(isInsuranceIntent(text)).toBe(false)
  })

  it('生成同一 Surface 下的完整 v0.9 命令序列', () => {
    const envelope = createInsuranceCardEnvelope('insurance-1')

    expect(envelope.surfaceId).toBe('insurance-1')
    expect(envelope.commands).toHaveLength(3)
    expect(envelope.commands.every((command) => command.version === 'v0.9')).toBe(true)
    expect(envelope.commands[0]).toHaveProperty('createSurface.surfaceId', 'insurance-1')
    expect(envelope.commands[1]).toHaveProperty('updateComponents.surfaceId', 'insurance-1')
    expect(envelope.commands[2]).toHaveProperty('updateDataModel.surfaceId', 'insurance-1')
  })
})
