// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActionPayload, XAgentCommand_v0_9 } from '@ant-design/x-card'

import { InsuranceActionError } from '../../api/submitInsuranceAction'
import type { ChatMessage, DynamicCardMessageContent } from '../../model/types'
import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { DynamicCardHostProvider } from '../../providers/DynamicCardHostProvider'
import { PlanDynamicCard } from './PlanDynamicCard'

interface BoxProps {
  readonly children: ReactNode
  readonly commands: readonly XAgentCommand_v0_9[]
  readonly onAction: (payload: ActionPayload) => void
}

const { boxCalls } = vi.hoisted(() => ({ boxCalls: [] as BoxProps[] }))

vi.mock('@ant-design/x-card', () => ({
  registerCatalog: vi.fn(),
  XCard: {
    Box: (props: BoxProps) => {
      boxCalls.push(props)
      return <div>{props.children}</div>
    },
    Card: ({ id }: { readonly id: string }) => <div data-card-id={id} />,
  },
}))

const CARD = { type: 'dynamic-card', surfaceId: 'plans-1', commands: [] } as const
const CONTEXT = { group_code: 'G0264', group_name: '安享一生', insur_list: ['AYR'] }

function readLastDataModelValue(path: string): unknown {
  const commands = boxCalls.at(-1)?.commands ?? []
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index]
    if ('updateDataModel' in command && command.updateDataModel.path === path) {
      return command.updateDataModel.value
    }
  }
  return undefined
}

// 构造带步骤指示器与提交按钮的保险流程卡片，用于历史陈旧判定场景。
function insuranceStepCard(surfaceId: string, step: number): DynamicCardMessageContent {
  return {
    type: 'dynamic-card',
    surfaceId,
    commands: [
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId,
          components: [
            {
              id: 'step',
              component: 'InsuranceStepIndicator',
              current: step,
              total: 4,
              title: '步骤',
            },
            { id: 'submit', component: 'InsuranceSubmitButton', text: '提交并继续' },
          ],
        },
      },
    ],
  }
}

describe('PlanDynamicCard', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    boxCalls.length = 0
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('上报卡片元素并将合法方案动作交给当前会话', async () => {
    const onReady = vi.fn()
    const submitCardAction = vi.fn()
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    const view = (
      <ChatSessionTestProvider value={{ submitCardAction, submitInsuranceAction }}>
        <DynamicCardHostProvider onReady={onReady}>
          <PlanDynamicCard card={CARD} />
        </DynamicCardHostProvider>
      </ChatSessionTestProvider>
    )

    act(() => root.render(view))
    act(() => root.render(view))

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(onReady).toHaveBeenCalledWith('plans-1', expect.any(HTMLDivElement))

    await act(async () => {
      boxCalls.at(-1)?.onAction({
        name: 'plan_apply',
        surfaceId: 'plans-1',
        context: CONTEXT,
      })
      await Promise.resolve()
    })
    expect(submitInsuranceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'plan_apply',
        surfaceId: 'plans-1',
        context: CONTEXT,
        eventId: expect.any(String),
      }),
    )
    expect(submitCardAction).not.toHaveBeenCalled()
  })

  it('拒绝未知动作及来自其他 surface 的动作', () => {
    const submitCardAction = vi.fn()
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ submitCardAction }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={CARD} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )

    act(() => {
      boxCalls.at(-1)?.onAction({ name: 'unknown', surfaceId: 'plans-1', context: {} })
      boxCalls.at(-1)?.onAction({ name: 'plan_apply', surfaceId: 'other', context: {} })
    })
    expect(submitCardAction).not.toHaveBeenCalled()
  })

  it('校验失败时保留投保人表单并写入字段错误', async () => {
    const form = {
      gender: 'MALE',
      name: '李海超',
      birth_date: '2002-09-26',
      occupation: '工程师',
      mobile: '17645103861',
      relationship: 'SELF',
      consent: true,
    }
    const submitInsuranceAction = vi.fn().mockRejectedValue(
      new InsuranceActionError('请检查投保人信息', {
        mobile: '请输入正确的11位大陆手机号',
      }),
    )
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ submitInsuranceAction }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={CARD} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )

    await act(async () => {
      boxCalls.at(-1)?.onAction({
        name: 'applicant_submit',
        surfaceId: 'plans-1',
        context: {
          application_id: 'app-1',
          expected_version: 1,
          form: { value: form },
        },
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(submitInsuranceAction).toHaveBeenCalledWith(
      expect.objectContaining({ context: expect.objectContaining({ form }) }),
    )
    expect(readLastDataModelValue('/form')).toEqual(form)
    expect(readLastDataModelValue('/errors')).toEqual({
      mobile: '请输入正确的11位大陆手机号',
    })
    expect(readLastDataModelValue('/ui/submitted')).not.toBe(true)
  })

  it('普通提交异常仅写入表单级错误', async () => {
    const submitInsuranceAction = vi.fn().mockRejectedValue(new Error('服务暂时不可用'))
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ submitInsuranceAction }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={CARD} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )

    await act(async () => {
      boxCalls.at(-1)?.onAction({
        name: 'applicant_submit',
        surfaceId: 'plans-1',
        context: { application_id: 'app-1', expected_version: 1 },
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(readLastDataModelValue('/errors')).toEqual({ form: '服务暂时不可用' })
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it('提交成功后保留表单数据并锁定旧卡片', async () => {
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ submitInsuranceAction }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={CARD} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )

    await act(async () => {
      boxCalls.at(-1)?.onAction({
        name: 'insured_submit',
        surfaceId: 'plans-1',
        context: {
          application_id: 'app-1',
          expected_version: 2,
          form: {
            value: { gender: 'MALE', name: '李四', birth_date: '2000-01-01' },
          },
        },
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(submitInsuranceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          form: { gender: 'MALE', name: '李四', birth_date: '2000-01-01' },
        }),
      }),
    )
    expect(readLastDataModelValue('/form')).toEqual({
      gender: 'MALE',
      name: '李四',
      birth_date: '2000-01-01',
    })
    expect(readLastDataModelValue('/errors')).toEqual({})
    expect(readLastDataModelValue('/ui/submitted')).toBe(true)
  })

  it('历史陈旧保险卡片注入禁用锁并拒绝动作', () => {
    const applicant = insuranceStepCard('ins-applicant', 1)
    const insured = insuranceStepCard('ins-insured', 2)
    const messages: readonly ChatMessage[] = [
      { id: 'm-1', role: 'assistant', content: [applicant], status: 'success' },
      { id: 'm-2', role: 'assistant', content: [insured], status: 'success' },
    ]
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ messages, submitInsuranceAction }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={applicant} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )

    expect(readLastDataModelValue('/ui')).toEqual({ submitted: true })

    act(() => {
      boxCalls.at(-1)?.onAction({
        name: 'applicant_submit',
        surfaceId: 'ins-applicant',
        context: {},
      })
    })
    expect(submitInsuranceAction).not.toHaveBeenCalled()
  })

  it('当前活跃保险卡片不注入禁用锁', () => {
    const insured = insuranceStepCard('ins-insured', 2)
    const messages: readonly ChatMessage[] = [
      {
        id: 'm-1',
        role: 'assistant',
        content: [insuranceStepCard('ins-applicant', 1)],
        status: 'success',
      },
      { id: 'm-2', role: 'assistant', content: [insured], status: 'success' },
    ]
    act(() =>
      root.render(
        <ChatSessionTestProvider value={{ messages }}>
          <DynamicCardHostProvider onReady={() => undefined}>
            <PlanDynamicCard card={insured} />
          </DynamicCardHostProvider>
        </ChatSessionTestProvider>,
      ),
    )

    expect(readLastDataModelValue('/ui')).toBeUndefined()
  })
})
