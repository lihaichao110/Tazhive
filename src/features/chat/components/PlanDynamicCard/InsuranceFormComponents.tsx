import { useEffect, type ChangeEvent, type ReactNode } from 'react'
import { Button, Form, Radio, type FormInstance } from 'antd'

import { getInsuranceInputRules } from './insuranceFormRules'
import { useInsuranceFormInstance } from './InsuranceFormInstanceContext'
import { useInsuranceSubmission } from './InsuranceSubmissionContext'
import styles from './InsuranceComponents.module.scss'

interface BoundFieldProps {
  readonly bindingPath: string
  readonly disabled?: boolean
  readonly error?: string
  readonly onDataChange?: (path: string, value: unknown) => void
}

interface InsuranceInputProps extends BoundFieldProps {
  readonly autocomplete?: string
  readonly field: string
  readonly inputType?: string
  readonly label: string
  readonly placeholder?: string
  readonly value?: string
}

interface InsuranceGenderRadioProps extends BoundFieldProps {
  readonly label: string
  readonly options: readonly { readonly label: string; readonly value: string }[]
  readonly value?: string
}

interface InsuranceRelationshipSelectProps extends BoundFieldProps {
  readonly label: string
  readonly options: readonly { readonly label: string; readonly value: string }[]
  readonly value?: string
}

interface InsuranceConsentProps extends BoundFieldProps {
  readonly checked?: boolean
  readonly text: string
}

interface InsuranceSubmitButtonProps {
  readonly action?: { readonly event?: { readonly name?: string } }
  readonly disabled?: boolean
  readonly onAction?: (name: string, context: Readonly<Record<string, unknown>>) => void
  readonly text: string
}

// 服务端组件树中提交按钮、关系选择与 InsuranceForm 是兄弟节点，
// Form 内优先取 antd 原生实例，Form 外回退到步骤布局层共享的实例，保证校验同一份数据。
function useStepForm(): FormInstance | null {
  const innerForm = Form.useFormInstance()
  const sharedForm = useInsuranceFormInstance()
  return innerForm ?? sharedForm
}

// 数据模型到 Form store 的持续同步；字段注册时的首帧种子由 Form.Item initialValue 承担，
// 避免原生输入在 effect 写入前出现 undefined → 定义值的非受控/受控切换。
function useSyncFormField(form: FormInstance | null, field: string, value: unknown): void {
  useEffect(() => {
    if (!form) return
    if (!Object.is(form.getFieldValue(field), value)) form.setFieldValue(field, value)
  }, [field, form, value])
}

// 以 Ant Design Form 作为当前步骤的校验边界，字段值仍同步到 XCard data model。
// form 实例优先沿用步骤布局层共享实例，使 Form 内外组件校验同一份数据。
export function InsuranceForm({ children }: { readonly children?: ReactNode }) {
  const [localForm] = Form.useForm()
  const sharedForm = useInsuranceFormInstance()
  return (
    <Form
      form={sharedForm ?? localForm}
      className={styles.form}
      labelCol={{ flex: '80px' }}
      labelWrap
      wrapperCol={{ flex: 1 }}
      layout="horizontal"
      requiredMark={false}
    >
      {children}
    </Form>
  )
}

export function InsuranceFormError({ message }: { readonly message?: string }) {
  return message ? (
    <p className={styles.formError} role="alert">
      {message}
    </p>
  ) : null
}

// 将输入控件同时注册到 Form，并把变化写回 XCard data model。
export function InsuranceInput({
  autocomplete,
  bindingPath,
  disabled,
  error,
  field,
  inputType = 'text',
  label,
  onDataChange,
  placeholder,
  value = '',
}: InsuranceInputProps) {
  const form = useStepForm()
  useSyncFormField(form, field, value)
  return (
    <Form.Item
      className={styles.field}
      label={label}
      name={field}
      initialValue={value}
      rules={getInsuranceInputRules(field, label, disabled)}
      validateStatus={error ? 'error' : undefined}
      help={error ? <span role="alert">{error}</span> : undefined}
      validateTrigger="onBlur"
    >
      <input
        name={field}
        type={inputType}
        placeholder={placeholder}
        autoComplete={autocomplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onDataChange?.(`/${bindingPath}`, event.target.value)
        }
      />
    </Form.Item>
  )
}

// 性别单选；选项由服务端下发，值写回 XCard data model。
export function InsuranceGenderRadio({
  bindingPath,
  disabled,
  error,
  label,
  onDataChange,
  options,
  value,
}: InsuranceGenderRadioProps) {
  const form = useStepForm()
  const field = 'gender'
  useSyncFormField(form, field, value)
  return (
    <Form.Item
      className={styles.field}
      label={label}
      name={field}
      initialValue={value}
      rules={disabled ? [] : [{ required: true, message: `请选择${label}` }]}
      validateStatus={error ? 'error' : undefined}
      help={error ? <span role="alert">{error}</span> : undefined}
    >
      <Radio.Group
        disabled={disabled}
        options={options.map((option) => ({ label: option.label, value: option.value }))}
        onChange={(event) => onDataChange?.(`/${bindingPath}`, event.target.value)}
      />
    </Form.Item>
  )
}

// 第一步的“投保人是被保人的”关系选择；选 SELF 时由服务端复制资料并跳过第二步。
export function InsuranceRelationshipSelect({
  bindingPath,
  disabled,
  error,
  label,
  onDataChange,
  options,
  value = '',
}: InsuranceRelationshipSelectProps) {
  const form = useStepForm()
  const field = 'relationship'
  useSyncFormField(form, field, value)
  return (
    <Form.Item
      className={styles.field}
      label={label}
      name={field}
      initialValue={value}
      rules={disabled ? [] : [{ required: true, message: `请选择${label}` }]}
      validateStatus={error ? 'error' : undefined}
      help={error ? <span role="alert">{error}</span> : undefined}
    >
      <select
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onDataChange?.(`/${bindingPath}`, event.target.value)
        }
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Form.Item>
  )
}

export function InsuranceConsent({
  bindingPath,
  checked = false,
  disabled,
  error,
  onDataChange,
  text,
}: InsuranceConsentProps) {
  const form = useStepForm()
  const field = 'consent'
  useSyncFormField(form, field, checked)
  return (
    <Form.Item
      className={styles.consent}
      name={field}
      initialValue={checked}
      valuePropName="checked"
      rules={
        disabled
          ? []
          : [
              {
                validator: async (_, value: unknown) => {
                  if (value !== true) throw new Error('请先阅读并同意授权声明')
                },
              },
            ]
      }
      validateStatus={error ? 'error' : undefined}
      help={error ? <span role="alert">{error}</span> : undefined}
    >
      <label>
        <input
          type="checkbox"
          disabled={disabled}
          onChange={(event) => onDataChange?.(`/${bindingPath}`, event.target.checked)}
        />
        <span>{text}</span>
      </label>
    </Form.Item>
  )
}

// 校验当前步骤全部字段，通过后才把动作交给 XCard 解析上下文并提交。
// 按钮可能位于 InsuranceForm 兄弟层级，form 实例来自步骤共享 context。
export function InsuranceSubmitButton({
  action,
  disabled,
  onAction,
  text,
}: InsuranceSubmitButtonProps) {
  const form = useStepForm()
  const { isSubmitting } = useInsuranceSubmission()
  const name = action?.event?.name

  const handleSubmit = async (): Promise<void> => {
    if (!name || disabled || isSubmitting) return
    if (!form) {
      console.warn('[InsuranceSubmitButton] 缺少表单实例，无法校验提交')
      return
    }
    try {
      await form.validateFields()
      onAction?.(name, {})
    } catch (error: unknown) {
      // 仅校验失败走字段提示；其余异常保留控制台线索，避免点击无反应且无迹可查。
      if (!error || typeof error !== 'object' || !('errorFields' in error)) {
        console.warn('[InsuranceSubmitButton] 提交校验异常', error)
        return
      }
      const errorFields = error.errorFields
      if (!Array.isArray(errorFields) || !errorFields[0] || typeof errorFields[0] !== 'object')
        return
      const firstName = 'name' in errorFields[0] ? errorFields[0].name : undefined
      if (Array.isArray(firstName)) form.scrollToField(firstName, { focus: true })
    }
  }

  return (
    <Button
      className={styles.submit}
      type="primary"
      htmlType="button"
      disabled={disabled || !name}
      loading={isSubmitting}
      onClick={() => void handleSubmit()}
    >
      {disabled ? '已提交' : text}
    </Button>
  )
}
