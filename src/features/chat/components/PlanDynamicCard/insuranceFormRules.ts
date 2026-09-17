import type { FormItemProps } from 'antd'

type Rule = NonNullable<FormItemProps['rules']>[number]

const MOBILE_PATTERN = /^1[3-9]\d{9}$/
const REQUIRED_FIELDS = new Set(['name', 'birth_date', 'occupation', 'mobile'])

// 提供固定保险字段的即时校验；业务有效性仍以后端校验结果为准。
export function getInsuranceInputRules(field: string, label: string, disabled = false): Rule[] {
  if (disabled) return []
  const rules: Rule[] = REQUIRED_FIELDS.has(field)
    ? [{ required: true, whitespace: true, message: `请输入${label}` }]
    : []
  if (field === 'mobile') rules.push({ pattern: MOBILE_PATTERN, message: '请输入正确的手机号' })
  if (field === 'birth_date') {
    rules.push({
      validator: async (_, value: unknown) => {
        if (typeof value !== 'string' || !value) return
        const selected = new Date(`${value}T00:00:00`)
        if (Number.isNaN(selected.getTime()) || selected > new Date()) {
          throw new Error('出生日期不能晚于今天')
        }
      },
    })
  }
  return rules
}
