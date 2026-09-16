import { useId, type ChangeEvent, type ReactNode } from 'react'

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

// 提供投保步骤卡片的统一布局边界。
export function InsuranceStepLayout({ children }: { readonly children?: ReactNode }) {
  return <section className={styles.layout}>{children}</section>
}

export function InsuranceStepIndicator(props: {
  readonly current: number
  readonly title: string
  readonly total: number
}) {
  return (
    <header className={styles.stepHeader}>
      <span className={styles.stepCount}>第 {props.current} 步</span>
      <h3>{props.title}</h3>
      <span className={styles.stepTotal}>共 {props.total} 步</span>
    </header>
  )
}

export function InsuranceForm({ children }: { readonly children?: ReactNode }) {
  return <div className={styles.form}>{children}</div>
}

export function InsuranceFormError({ message }: { readonly message?: string }) {
  return message ? (
    <p className={styles.formError} role="alert">
      {message}
    </p>
  ) : null
}

// 将原生输入变化写回 XCard data model，身份证字段禁止浏览器自动保存。
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
  const inputId = `insurance-${field}-${useId()}`
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onDataChange?.(`/${bindingPath}`, event.target.value)
  }
  return (
    <label className={styles.field} htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        name={field}
        type={inputType}
        value={value}
        placeholder={placeholder}
        autoComplete={autocomplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={handleChange}
      />
      {error ? (
        <span id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

// 关系选择同时控制“本人”模式，身份字段在该模式下不重复采集。
export function InsuranceRelationshipSelect({
  bindingPath,
  disabled,
  error,
  label,
  onDataChange,
  options,
  value = '',
}: InsuranceRelationshipSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value
    onDataChange?.(`/${bindingPath}`, next)
    onDataChange?.('/ui/person_fields_disabled', next === 'SELF')
  }
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={handleChange}
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
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
  return (
    <label className={styles.consent}>
      <span>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onDataChange?.(`/${bindingPath}`, event.target.checked)}
        />
        {text}
      </span>
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  )
}

export function InsuranceSameApplicantHint(props: {
  readonly mobile: string
  readonly name: string
  readonly visible?: boolean
}) {
  if (!props.visible) return null
  return (
    <p className={styles.hint}>
      将沿用投保人资料：{props.name}，{props.mobile}
    </p>
  )
}

export function InsuranceSubmitButton({
  action,
  disabled,
  onAction,
  text,
}: InsuranceSubmitButtonProps) {
  const name = action?.event?.name
  return (
    <button
      className={styles.submit}
      type="button"
      disabled={disabled || !name}
      onClick={() => name && onAction?.(name, {})}
    >
      {disabled ? '已提交' : text}
    </button>
  )
}

const RELATION_LABELS: Readonly<Record<string, string>> = {
  SELF: '本人',
  SPOUSE: '配偶',
  CHILD: '子女',
  PARENT: '父母',
}

export function InsurancePlanSummary(props: {
  readonly applicant: Readonly<Record<string, string>>
  readonly groupName: string
  readonly insured: Readonly<Record<string, string>>
  readonly insurList: readonly string[]
  readonly relationship: string
  readonly title: string
}) {
  return (
    <dl className={styles.summary}>
      <dt>投保方案</dt>
      <dd>{props.groupName}</dd>
      <dt>方案分类</dt>
      <dd>{props.title}</dd>
      <dt>险种代码</dt>
      <dd>{props.insurList.join('、')}</dd>
      <dt>投保人</dt>
      <dd>
        {props.applicant.name} / {props.applicant.mobile} / {props.applicant.id_number}
      </dd>
      <dt>被保险人</dt>
      <dd>
        {props.insured.name}（{RELATION_LABELS[props.relationship] ?? props.relationship}）
      </dd>
    </dl>
  )
}

export function InsuranceCompletion({ applicationId }: { readonly applicationId: string }) {
  return (
    <section className={styles.completion} role="status">
      <strong>基础资料已确认</strong>
      <span>投保单号：{applicationId}</span>
      <p>后续流程待接入，请留意下一步通知。</p>
    </section>
  )
}
