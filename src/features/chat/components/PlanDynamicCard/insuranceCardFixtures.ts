import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

import { PLAN_CATALOG_ID } from '../../model/planCard'
import type { DynamicCardMessageContent } from '../../model/types'

// v0.9 组件树节点：children 为子节点 id 列表，根节点固定为 root。
type TreeNode = Record<string, unknown> & {
  readonly id: string
  readonly component: string
  readonly children?: readonly string[]
}

/** 与服务端命令同形的基础构造器，供动态卡片测试复用。 */
export function command(payload: Record<string, unknown>): XAgentCommand_v0_9 {
  return { version: 'v0.9', ...payload } as XAgentCommand_v0_9
}

export function dataCommand(surfaceId: string, path: string, value: unknown): XAgentCommand_v0_9 {
  return command({ updateDataModel: { surfaceId, path, value } })
}

export function cardOf(
  surfaceId: string,
  commands: readonly XAgentCommand_v0_9[],
): DynamicCardMessageContent {
  return { type: 'dynamic-card', surfaceId, commands }
}

function submitAction(name: string): Record<string, unknown> {
  return {
    event: {
      name,
      context: {
        application_id: 'app-1',
        expected_version: 1,
        form: { path: '/form' },
      },
    },
  }
}

// 构造带步骤指示器与提交按钮的保险流程卡片，用于陈旧判定与快照回填场景。
export function insuranceStepCard(surfaceId: string, step: number): DynamicCardMessageContent {
  const components = [
    { id: 'step', component: 'InsuranceStepIndicator', current: step, total: 4, title: '步骤' },
    { id: 'submit', component: 'InsuranceSubmitButton', text: '提交并继续' },
  ]
  return cardOf(surfaceId, [command({ updateComponents: { surfaceId, components } })])
}

// 与后端 build_applicant_form 同形：性别单选与关系下拉都在 form 内，值均为 {path} 引用。
export function applicantCard(surfaceId: string): DynamicCardMessageContent {
  const nodes: readonly TreeNode[] = [
    {
      id: 'root',
      component: 'InsuranceStepLayout',
      children: ['step', 'form', 'form_error', 'submit'],
    },
    {
      id: 'step',
      component: 'InsuranceStepIndicator',
      current: 1,
      total: 3,
      title: '投保人信息',
    },
    {
      id: 'form',
      component: 'InsuranceForm',
      children: [
        'field_gender',
        'field_name',
        'field_mobile',
        'field_relationship',
        'field_consent',
      ],
    },
    {
      id: 'field_gender',
      component: 'InsuranceGenderRadio',
      label: '性别',
      bindingPath: 'form/gender',
      value: { path: '/form/gender' },
      error: { path: '/errors/gender' },
      disabled: { path: '/ui/submitted' },
      options: [
        { label: '男', value: 'MALE' },
        { label: '女', value: 'FEMALE' },
      ],
    },
    {
      id: 'field_name',
      component: 'InsuranceInput',
      field: 'name',
      label: '姓名',
      inputType: 'text',
      bindingPath: 'form/name',
      value: { path: '/form/name' },
      error: { path: '/errors/name' },
      disabled: { path: '/ui/submitted' },
    },
    {
      id: 'field_mobile',
      component: 'InsuranceInput',
      field: 'mobile',
      label: '手机号',
      inputType: 'tel',
      bindingPath: 'form/mobile',
      value: { path: '/form/mobile' },
      error: { path: '/errors/mobile' },
      disabled: { path: '/ui/submitted' },
    },
    {
      id: 'field_relationship',
      component: 'InsuranceRelationshipSelect',
      label: '投保人是被保人的',
      bindingPath: 'form/relationship',
      value: { path: '/form/relationship' },
      error: { path: '/errors/relationship' },
      disabled: { path: '/ui/submitted' },
      options: [
        { label: '本人', value: 'SELF' },
        { label: '配偶', value: 'SPOUSE' },
      ],
    },
    {
      id: 'field_consent',
      component: 'InsuranceConsent',
      text: '同意授权',
      bindingPath: 'form/consent',
      checked: { path: '/form/consent' },
      error: { path: '/errors/consent' },
      disabled: { path: '/ui/submitted' },
    },
    { id: 'form_error', component: 'InsuranceFormError', message: { path: '/errors/form' } },
    {
      id: 'submit',
      component: 'InsuranceSubmitButton',
      text: '提交并继续',
      disabled: { path: '/ui/submitted' },
      action: submitAction('applicant_submit'),
    },
  ]
  return cardOf(surfaceId, [
    command({ createSurface: { surfaceId, catalogId: PLAN_CATALOG_ID } }),
    command({ updateComponents: { surfaceId, components: nodes } }),
    dataCommand(surfaceId, '/form', {}),
    dataCommand(surfaceId, '/errors', {}),
    dataCommand(surfaceId, '/ui', { submitted: false }),
  ])
}

// 与后端 build_insured_form 同形：关系已在第一步采集，第二步仅人员字段。
export function insuredCard(surfaceId: string): DynamicCardMessageContent {
  const nodes: readonly TreeNode[] = [
    {
      id: 'root',
      component: 'InsuranceStepLayout',
      children: ['step', 'form', 'form_error', 'submit'],
    },
    {
      id: 'step',
      component: 'InsuranceStepIndicator',
      current: 2,
      total: 3,
      title: '被保险人信息',
    },
    { id: 'form', component: 'InsuranceForm', children: ['field_gender', 'field_name'] },
    {
      id: 'field_gender',
      component: 'InsuranceGenderRadio',
      label: '性别',
      bindingPath: 'form/gender',
      value: { path: '/form/gender' },
      error: { path: '/errors/gender' },
      disabled: { path: '/ui/submitted' },
      options: [
        { label: '男', value: 'MALE' },
        { label: '女', value: 'FEMALE' },
      ],
    },
    {
      id: 'field_name',
      component: 'InsuranceInput',
      field: 'name',
      label: '姓名',
      inputType: 'text',
      bindingPath: 'form/name',
      value: { path: '/form/name' },
      error: { path: '/errors/name' },
      disabled: { path: '/ui/submitted' },
    },
    { id: 'form_error', component: 'InsuranceFormError', message: { path: '/errors/form' } },
    {
      id: 'submit',
      component: 'InsuranceSubmitButton',
      text: '提交并进入方案确认',
      disabled: { path: '/ui/submitted' },
      action: submitAction('insured_submit'),
    },
  ]
  return cardOf(surfaceId, [
    command({ createSurface: { surfaceId, catalogId: PLAN_CATALOG_ID } }),
    command({ updateComponents: { surfaceId, components: nodes } }),
    dataCommand(surfaceId, '/form', {}),
    dataCommand(surfaceId, '/errors', {}),
    dataCommand(surfaceId, '/ui', { submitted: false }),
  ])
}
