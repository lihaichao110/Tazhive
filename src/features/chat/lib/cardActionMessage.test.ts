import { describe, expect, it } from 'vitest'

import {
  formatCardActionSummary,
  parseCardActionMessage,
  serializeCardActionMessage,
} from './cardActionMessage'

const ACTION = {
  name: 'plan_apply',
  surfaceId: 'insurance_plans_abcd1234',
  context: { group_code: 'G0264', group_name: '安享一生', insur_list: ['AYR'] },
} as const

describe('cardActionMessage', () => {
  it('序列化并恢复方案卡片动作', () => {
    const source = serializeCardActionMessage(ACTION)

    expect(JSON.parse(source)).toEqual({ type: 'a2ui_action', ...ACTION })
    expect(parseCardActionMessage(source)).toEqual(ACTION)
  })

  it('为投保和预核保动作生成友好摘要', () => {
    expect(formatCardActionSummary(ACTION)).toBe('已选择「安享一生」正式投保')
    expect(formatCardActionSummary({ ...ACTION, name: 'plan_pre_underwrite' })).toBe(
      '已选择「安享一生」进行预核保',
    )
  })

  it.each([
    '{broken}',
    '{"type":"other","name":"plan_apply","surfaceId":"s","context":{}}',
    '{"type":"a2ui_action","name":"unknown","surfaceId":"s","context":{}}',
  ])('拒绝非法或未知动作：%s', (source) => {
    expect(parseCardActionMessage(source)).toBeNull()
  })
})
