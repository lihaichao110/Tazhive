import { describe, expect, it } from 'vitest'

import { formatInsuranceConfirmation, maskPhone } from './insuranceSubmission'

describe('insuranceSubmission', () => {
  it('脱敏手机号中间四位', () => {
    expect(maskPhone('13800138000')).toBe('138****8000')
  })

  it('生成用户可读且不包含完整手机号的确认消息', () => {
    const confirmation = formatInsuranceConfirmation({
      name: '张三',
      birthDate: '1990-01-01',
      gender: 'male',
      phone: '13800138000',
    })

    expect(confirmation).toContain('投保信息已收集')
    expect(confirmation).toContain('姓名：张三')
    expect(confirmation).toContain('性别：男')
    expect(confirmation).toContain('138****8000')
    expect(confirmation).not.toContain('13800138000')
  })
})
