import { describe, expect, it } from 'vitest'

import {
  getBirthDateError,
  getNameError,
  getPhoneError,
  isValidInsuranceSubmission,
} from './insuranceValidation'

describe('insuranceValidation', () => {
  it('拒绝空姓名和超出长度限制的姓名', () => {
    expect(getNameError('  ')).toBe('请输入姓名')
    expect(getNameError('张')).toBe('姓名长度应为 2–30 个字符')
    expect(getNameError('张三')).toBeNull()
  })

  it('拒绝空日期和未来出生日期', () => {
    expect(getBirthDateError('')).toBe('请选择出生日期')
    expect(getBirthDateError('2999-01-01')).toBe('出生日期不能晚于今天')
    expect(getBirthDateError('1990-01-01')).toBeNull()
  })

  it('按中国大陆手机号规则校验', () => {
    expect(getPhoneError('')).toBe('请输入手机号')
    expect(getPhoneError('123456')).toBe('请输入有效的手机号')
    expect(getPhoneError('13800138000')).toBeNull()
  })

  it('只有四项数据全部合法时允许提交', () => {
    expect(
      isValidInsuranceSubmission({
        name: '张三',
        birthDate: '1990-01-01',
        gender: 'male',
        phone: '13800138000',
      }),
    ).toBe(true)
  })
})
