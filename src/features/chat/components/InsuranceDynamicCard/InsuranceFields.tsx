import { useRef, useState, type ReactNode } from 'react'
import { Button, Form, Input, Radio } from 'antd'

import { INSURANCE_SUBMIT_ACTION } from '../../model/insuranceCard'
import {
  getBirthDateError,
  getNameError,
  getPhoneError,
  getToday,
  isValidInsuranceSubmission,
} from '../../model/insuranceValidation'
import type { InsuranceSubmission } from '../../model/types'

import styles from './InsuranceDynamicCard.module.scss'

interface DataBindingProps {
  readonly bindingPath: string
  readonly onDataChange?: (path: string, value: string) => void
}

interface InsuranceFormProps {
  readonly children?: ReactNode
}

interface TextProps {
  readonly text: string
  readonly variant?: 'title' | 'description'
}

interface TextFieldProps extends DataBindingProps {
  readonly name: 'name' | 'phone'
  readonly label: string
  readonly placeholder?: string
  readonly value?: string
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
}

interface DateFieldProps extends DataBindingProps {
  readonly name: 'birthDate'
  readonly label: string
  readonly value?: string
}

interface GenderOption {
  readonly label: string
  readonly value: 'male' | 'female'
}

interface GenderFieldProps extends DataBindingProps {
  readonly name: 'gender'
  readonly label: string
  readonly value?: string
  readonly options: readonly GenderOption[]
}

interface SubmitButtonProps {
  readonly text: string
  readonly action?: { readonly event?: { readonly name?: string } }
  readonly onAction?: (name: string, context: { insurance: InsuranceSubmission }) => void
}

async function rejectValidationError(message: string | null): Promise<void> {
  if (message) throw new Error(message)
}

// 为所有动态字段提供同一个校验上下文，字段结构仍由 A2UI 子节点决定。
export function InsuranceForm({ children }: InsuranceFormProps) {
  return (
    <section className={styles.card} aria-label="投保人信息表单">
      <Form layout="vertical">{children}</Form>
    </section>
  )
}

export function InsuranceText({ text, variant = 'description' }: TextProps) {
  return variant === 'title' ? (
    <h3 className={styles.title}>{text}</h3>
  ) : (
    <p className={styles.description}>{text}</p>
  )
}

// 渲染文本字段；编辑态由同一个 Form 维护，避免与 XCard dataModel 形成双状态竞争。
export function InsuranceTextField({
  label,
  maxLength,
  name,
  placeholder,
  value = '',
}: TextFieldProps) {
  const isPhone = name === 'phone'
  const validate = isPhone ? getPhoneError : getNameError

  return (
    <Form.Item
      name={name}
      label={label}
      initialValue={value}
      validateFirst
      rules={[
        {
          validator: async (_, fieldValue: string | undefined) =>
            rejectValidationError(validate(fieldValue)),
        },
        { required: true },
      ]}
    >
      <Input
        autoComplete={isPhone ? 'tel' : 'name'}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </Form.Item>
  )
}

export function InsuranceDateField({ label, name, value = '' }: DateFieldProps) {
  return (
    <Form.Item
      name={name}
      label={label}
      initialValue={value}
      validateFirst
      rules={[
        {
          validator: async (_, date: string | undefined) =>
            rejectValidationError(getBirthDateError(date)),
        },
        { required: true },
      ]}
    >
      <Input type="date" max={getToday()} />
    </Form.Item>
  )
}

export function InsuranceGenderField({ label, name, options, value = '' }: GenderFieldProps) {
  return (
    <Form.Item name={name} label={label} initialValue={value} rules={[{ required: true }]}>
      <Radio.Group options={[...options]} />
    </Form.Item>
  )
}

// 校验全部字段并在首次成功后锁定提交，避免重复产生业务 Action。
export function InsuranceSubmitButton({ action, onAction, text }: SubmitButtonProps) {
  const form = Form.useFormInstance<InsuranceSubmission>()
  const submittedRef = useRef(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (): Promise<void> => {
    if (submittedRef.current) return
    try {
      const values = await form.validateFields()
      const insurance = { ...values, name: values.name.trim() }
      if (!isValidInsuranceSubmission(insurance)) return
      submittedRef.current = true
      setIsSubmitted(true)
      onAction?.(action?.event?.name ?? INSURANCE_SUBMIT_ACTION, { insurance })
    } catch {
      // Form.Item 已负责呈现字段错误；失败时必须保持按钮可再次提交。
    }
  }

  return (
    <Button type="primary" block disabled={isSubmitted} onClick={() => void handleSubmit()}>
      {isSubmitted ? '已提交' : text}
    </Button>
  )
}
