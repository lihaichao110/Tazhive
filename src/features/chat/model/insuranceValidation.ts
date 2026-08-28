import type { InsuranceSubmission } from './types'

const PHONE_PATTERN = /^1[3-9]\d{9}$/

export function getToday(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNameError(value: string | undefined): string | null {
  const name = value?.trim() ?? ''
  if (!name) return '请输入姓名'
  if (name.length < 2 || name.length > 30) return '姓名长度应为 2–30 个字符'
  return null
}

export function getBirthDateError(value: string | undefined): string | null {
  if (!value) return '请选择出生日期'
  if (value > getToday()) return '出生日期不能晚于今天'
  return null
}

export function getPhoneError(value: string | undefined): string | null {
  if (!value) return '请输入手机号'
  return PHONE_PATTERN.test(value) ? null : '请输入有效的手机号'
}

// 提交边界再次校验完整数据，避免仅依赖展示组件的交互校验。
export function isValidInsuranceSubmission(value: InsuranceSubmission): boolean {
  return (
    !getNameError(value.name) &&
    !getBirthDateError(value.birthDate) &&
    ['male', 'female'].includes(value.gender) &&
    !getPhoneError(value.phone)
  )
}
