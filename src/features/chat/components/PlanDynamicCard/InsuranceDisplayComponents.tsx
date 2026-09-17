import { Button } from 'antd'

import styles from './InsuranceComponents.module.scss'

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
        {props.applicant.name} / {props.applicant.mobile}
      </dd>
      <dt>被保险人</dt>
      <dd>
        {props.insured.name}（{RELATION_LABELS[props.relationship] ?? props.relationship}）
      </dd>
    </dl>
  )
}

interface InsuranceCompletionProps {
  readonly applicationId: string
}

// 展示投保流程最终状态；完成摘要仅保留投保单号，方案与投被保人信息不在此展示。
export function InsuranceCompletion(props: InsuranceCompletionProps) {
  return (
    <section className={styles.completion} role="status">
      <div className={styles.successIcon} aria-hidden="true">
        ✓
      </div>
      <h2>投保资料提交成功</h2>
      <p className={styles.completionLead}>基础资料已确认，请留意后续通知。</p>
      <dl className={styles.completionSummary}>
        <dt>投保单号</dt>
        <dd>{props.applicationId}</dd>
      </dl>
      <Button type="primary" size="large" block disabled title="详情功能建设中">
        查看投保详情（建设中）
      </Button>
    </section>
  )
}
