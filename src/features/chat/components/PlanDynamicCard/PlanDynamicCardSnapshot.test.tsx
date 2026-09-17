// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActionPayload, XAgentCommand_v0_9 } from '@ant-design/x-card'

import type { ChatMessage } from '../../model/types'
import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { DynamicCardHostProvider } from '../../providers/DynamicCardHostProvider'
import { insuranceStepCard } from './insuranceCardFixtures'
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

// 聚焦提交快照与陈旧锁：命令被服务端消息重置后，已提交数据与禁用态必须保留。
describe('PlanDynamicCard 提交快照与陈旧锁', () => {
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

  it('提交成功后卡片陈旧化，命令重置仍回填表单快照与提交锁', async () => {
    const applicant = insuranceStepCard('ins-applicant', 1)
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    const render = (messages: readonly ChatMessage[]): void =>
      act(() =>
        root.render(
          <ChatSessionTestProvider value={{ messages, submitInsuranceAction }}>
            <DynamicCardHostProvider onReady={() => undefined}>
              <PlanDynamicCard card={applicant} />
            </DynamicCardHostProvider>
          </ChatSessionTestProvider>,
        ),
      )

    render([])
    const form = { gender: 'MALE', name: '张三', mobile: '13800138000' }
    await act(async () => {
      boxCalls.at(-1)?.onAction({
        name: 'applicant_submit',
        surfaceId: 'ins-applicant',
        context: { application_id: 'app-1', expected_version: 1, form: { value: form } },
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    // 服务端按步骤追加新卡片消息，投保人卡陈旧化触发运行时命令重置。
    render([
      { id: 'm-1', role: 'assistant', content: [applicant], status: 'success' },
      {
        id: 'm-2',
        role: 'assistant',
        content: [insuranceStepCard('ins-insured', 2)],
        status: 'success',
      },
    ])

    expect(readLastDataModelValue('/form')).toEqual(form)
    expect(readLastDataModelValue('/ui')).toEqual({ submitted: true })
    expect(readLastDataModelValue('/ui/submitted')).toBe(true)
  })

  it('同 surface 原地推进到新步骤时不回填旧快照', async () => {
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    const render = (card: ReturnType<typeof insuranceStepCard>): void =>
      act(() =>
        root.render(
          <ChatSessionTestProvider value={{ submitInsuranceAction }}>
            <DynamicCardHostProvider onReady={() => undefined}>
              <PlanDynamicCard card={card} />
            </DynamicCardHostProvider>
          </ChatSessionTestProvider>,
        ),
      )

    render(insuranceStepCard('ins-1', 1))
    await act(async () => {
      boxCalls.at(-1)?.onAction({
        name: 'applicant_submit',
        surfaceId: 'ins-1',
        context: {
          application_id: 'app-1',
          expected_version: 1,
          form: { value: { name: '张三' } },
        },
      })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(readLastDataModelValue('/form')).toEqual({ name: '张三' })

    // 服务端以同一条消息原地更新为被保人步骤，新步骤表单必须从空种子开始。
    render(insuranceStepCard('ins-1', 2))

    expect(readLastDataModelValue('/form')).toBeUndefined()
    expect(readLastDataModelValue('/ui/submitted')).toBeUndefined()
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
