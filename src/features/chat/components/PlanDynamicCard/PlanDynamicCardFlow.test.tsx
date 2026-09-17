// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

import { PLAN_CATALOG_ID } from '../../model/planCard'
import type { DynamicCardMessageContent } from '../../model/types'
import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { DynamicCardHostProvider } from '../../providers/DynamicCardHostProvider'
import { PlanDynamicCard } from './PlanDynamicCard'

// v0.9 组件树节点：children 为子节点 id 列表，根节点固定为 root。
type TreeNode = Record<string, unknown> & {
  readonly id: string
  readonly component: string
  readonly children?: readonly string[]
}

function command(payload: Record<string, unknown>): XAgentCommand_v0_9 {
  return { version: 'v0.9', ...payload } as XAgentCommand_v0_9
}

function dataCommand(surfaceId: string, path: string, value: unknown): XAgentCommand_v0_9 {
  return command({ updateDataModel: { surfaceId, path, value } })
}

function cardOf(
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

// 与后端 build_applicant_form 同形：性别单选与关系下拉都在 form 内，值均为 {path} 引用。
function applicantCard(surfaceId: string): DynamicCardMessageContent {
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
function insuredCard(surfaceId: string): DynamicCardMessageContent {
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

function setInputValue(host: HTMLElement, selector: string, value: string): void {
  const input = host.querySelector(selector) as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function setSelectValue(host: HTMLElement, selector: string, value: string): void {
  const select = host.querySelector(selector) as HTMLSelectElement
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  setter?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('PlanDynamicCard 真实 XCard 投保推进链路', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('提交按钮位于 Form 兄弟层级时仍能校验并触发投保动作', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    const render = (card: DynamicCardMessageContent): void =>
      act(() =>
        root.render(
          <ChatSessionTestProvider value={{ submitInsuranceAction }}>
            <DynamicCardHostProvider onReady={() => undefined}>
              <PlanDynamicCard card={card} />
            </DynamicCardHostProvider>
          </ChatSessionTestProvider>,
        ),
      )

    render(applicantCard('ins-1'))
    await vi.waitFor(() => expect(host.querySelector('input[name="name"]')).toBeTruthy())

    await act(async () => {
      ;(host.querySelector('input[type="radio"][value="MALE"]') as HTMLInputElement).click()
      setInputValue(host, 'input[name="name"]', '张三')
      setInputValue(host, 'input[name="mobile"]', '13800138000')
      setSelectValue(host, 'select', 'SELF')
      ;(host.querySelector('input[type="checkbox"]') as HTMLInputElement).click()
    })

    await act(async () => {
      ;(host.querySelector('button') as HTMLButtonElement).click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(submitInsuranceAction).toHaveBeenCalledTimes(1)
    expect(submitInsuranceAction.mock.calls[0][0]).toMatchObject({
      name: 'applicant_submit',
      surfaceId: 'ins-1',
      context: {
        form: {
          gender: 'MALE',
          name: '张三',
          mobile: '13800138000',
          relationship: 'SELF',
          consent: true,
        },
        application_id: 'app-1',
        expected_version: 1,
      },
    })

    // 服务端以同一条消息 id 原地更新 a2ui 命令，模拟 upsertHistoryMessages 后的重渲染。
    render(insuredCard('ins-1'))
    await vi.waitFor(() => expect(host.textContent).toContain('提交并进入方案确认'))
    expect(host.querySelector('input[type="radio"]')).toBeTruthy()
    expect((host.querySelector('button') as HTMLButtonElement).disabled).toBe(false)

    // 回归：投保人与被保人共用 /form/* 路径，新步骤字段不得预填旧步骤数据。
    const insuredNameInput = host.querySelector('input[name="name"]') as HTMLInputElement
    expect(insuredNameInput.value).toBe('')
    expect(
      Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]')).every(
        (radio) => !radio.checked,
      ),
    ).toBe(true)

    // 回归：字段注册即种子表单值，不允许出现非受控/受控切换警告。
    expect(consoleError.mock.calls.some((args) => String(args[0]).includes('uncontrolled'))).toBe(
      false,
    )
    consoleError.mockRestore()
  })

  it('校验失败时提交被阻止且错误回显到字段', async () => {
    const submitInsuranceAction = vi.fn()
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ submitInsuranceAction }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={applicantCard('ins-2')} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )
    await vi.waitFor(() => expect(host.querySelector('input[name="name"]')).toBeTruthy())

    await act(async () => {
      ;(host.querySelector('button') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(submitInsuranceAction).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(host.textContent).toContain('请输入姓名'))
  })
})
