import type { ReactNode } from 'react'
import { Form, Steps } from 'antd'

import { InsuranceFormInstanceProvider } from './InsuranceFormInstanceContext'
import styles from './InsuranceComponents.module.scss'

const INSURANCE_STEPS = [
  { title: '投保人信息' },
  { title: '被保人信息' },
  { title: '信息确认' },
  { title: '完成' },
]

// 提供投保步骤卡片的统一布局边界，并承载整步共享的表单实例：
// 服务端组件树把提交按钮、错误提示与 InsuranceForm 排成兄弟节点，
// form 生命周期必须覆盖整个步骤子树，按钮才能校验到字段值。
export function InsuranceStepLayout({ children }: { readonly children?: ReactNode }) {
  const [form] = Form.useForm()
  return (
    <section className={styles.layout}>
      <InsuranceFormInstanceProvider value={form}>{children}</InsuranceFormInstanceProvider>
    </section>
  )
}

// 将服务端一基步骤序号映射为 Ant Design Steps 的零基当前项。
export function InsuranceStepIndicator(props: {
  readonly current: number
  readonly title: string
  readonly total: number
}) {
  const current = Math.min(Math.max(props.current - 1, 0), INSURANCE_STEPS.length - 1)
  return (
    <header className={styles.stepHeader} aria-label={`当前步骤：${props.title}`}>
      <Steps
        current={current}
        items={INSURANCE_STEPS}
        responsive={false}
        titlePlacement="vertical"
        size="small"
        variant="outlined"
        aria-label={`投保进度，共 ${props.total} 步`}
      />
    </header>
  )
}
