import type { InsuranceSubmission } from '../model/types'

export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

// 将已校验的投保信息转换为不暴露完整手机号的对话确认文本。
export function formatInsuranceConfirmation(submission: InsuranceSubmission): string {
  const gender = submission.gender === 'male' ? '男' : '女'
  return [
    '### 投保信息已收集',
    '',
    `- 姓名：${submission.name}`,
    `- 出生日期：${submission.birthDate}`,
    `- 性别：${gender}`,
    `- 手机号：${maskPhone(submission.phone)}`,
    '',
    '以上信息仅保存在当前页面中。',
  ].join('\n')
}
