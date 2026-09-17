import { describe, expect, it } from 'vitest'

import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

import { isStaleInsuranceFormCard } from './insuranceCardProgress'
import type { ChatMessage, DynamicCardMessageContent } from './types'

// 从命令联合类型推导组件节点元素类型，包根未导出 BaseComponent_v0_9，避免深层导入。
type A2UIComponent = Extract<
  XAgentCommand_v0_9,
  { updateComponents: unknown }
>['updateComponents']['components'][number]

// 构造仅含步骤指示器（可选提交按钮）的保险流程卡片命令。
function insuranceCardCommands(step: number, withSubmit: boolean): XAgentCommand_v0_9[] {
  const components: A2UIComponent[] = [
    { id: 'step', component: 'InsuranceStepIndicator', current: step, total: 4, title: '步骤' },
  ]
  if (withSubmit) {
    components.push({ id: 'submit', component: 'InsuranceSubmitButton', text: '提交并继续' })
  }
  return [{ version: 'v0.9', updateComponents: { surfaceId: 'ins-1', components } }]
}

function cardOf(
  surfaceId: string,
  commands: readonly XAgentCommand_v0_9[],
): DynamicCardMessageContent {
  return { type: 'dynamic-card', surfaceId, commands }
}

function messageOf(...cards: readonly DynamicCardMessageContent[]): ChatMessage {
  return { id: `m-${cards.length}`, role: 'assistant', content: [...cards], status: 'success' }
}

describe('isStaleInsuranceFormCard', () => {
  it('消息列表不含投保流程卡片时不限制', () => {
    const card = cardOf('ins-1', insuranceCardCommands(1, true))
    expect(isStaleInsuranceFormCard(card, [])).toBe(false)
  })

  it('非保险流程卡片（无步骤指示器）永不视为陈旧', () => {
    const planCard = cardOf('plan-1', [
      { version: 'v0.9', updateComponents: { surfaceId: 'plan-1', components: [] } },
    ])
    const insuredCard = cardOf('ins-2', insuranceCardCommands(2, true))
    expect(isStaleInsuranceFormCard(planCard, [messageOf(insuredCard)])).toBe(false)
  })

  it('列表只有本卡时保持可操作', () => {
    const card = cardOf('ins-1', insuranceCardCommands(1, true))
    expect(isStaleInsuranceFormCard(card, [messageOf(card)])).toBe(false)
  })

  it('被保人步骤出现后，投保人表单视为陈旧而被保人保持可操作', () => {
    const applicant = cardOf('ins-applicant', insuranceCardCommands(1, true))
    const insured = cardOf('ins-insured', insuranceCardCommands(2, true))
    const messages = [messageOf(applicant), messageOf(insured)]
    expect(isStaleInsuranceFormCard(applicant, messages)).toBe(true)
    expect(isStaleInsuranceFormCard(insured, messages)).toBe(false)
  })

  it('流程推进到只读终态（无提交按钮）后全部表单视为陈旧', () => {
    const applicant = cardOf('ins-applicant', insuranceCardCommands(1, true))
    const insured = cardOf('ins-insured', insuranceCardCommands(2, true))
    const completion = cardOf('ins-done', insuranceCardCommands(4, false))
    const messages = [messageOf(applicant), messageOf(insured), messageOf(completion)]
    expect(isStaleInsuranceFormCard(applicant, messages)).toBe(true)
    expect(isStaleInsuranceFormCard(insured, messages)).toBe(true)
  })

  it('完成卡不带步骤指示器，出现后确认卡同样视为陈旧', () => {
    const confirm = cardOf('ins-confirm', insuranceCardCommands(3, true))
    const completion = cardOf('ins-done', [
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'ins-done',
          components: [{ id: 'done', component: 'InsuranceCompletion', applicationId: 'app-1' }],
        },
      },
    ])
    const messages = [messageOf(confirm), messageOf(completion)]
    expect(isStaleInsuranceFormCard(confirm, messages)).toBe(true)
  })
})
