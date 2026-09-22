// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActionPayload, XAgentCommand_v0_9 } from '@ant-design/x-card'

import type { InsuranceActionResponse } from '../../api/submitInsuranceAction'
import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import type { ChatSessionValue } from '../../providers/ChatSessionContext'
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
const ACTION: ActionPayload = {
  name: 'plan_apply',
  surfaceId: 'plans-1',
  context: { group_code: 'G0264', group_name: '安享一生', insur_list: ['AYR'] },
}
const SUCCESS_RESPONSE = { outcome: 'advanced' } as InsuranceActionResponse

// 构造只关注浏览器兼容性的动态卡片宿主，避免业务流程测试重复承担环境分支。
function renderCard(
  host: HTMLDivElement,
  submitInsuranceAction: ChatSessionValue['submitInsuranceAction'],
): Root {
  const root = createRoot(host)
  act(() =>
    root.render(
      <ChatSessionTestProvider value={{ submitInsuranceAction }}>
        <DynamicCardHostProvider onReady={() => undefined}>
          <PlanDynamicCard card={CARD} />
        </DynamicCardHostProvider>
      </ChatSessionTestProvider>,
    ),
  )
  return root
}

describe('PlanDynamicCard 移动 WebView 兼容性', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    boxCalls.length = 0
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
  })

  afterEach(() => {
    act(() => root?.unmount())
    vi.unstubAllGlobals()
  })

  it('缺少 randomUUID 时仍使用安全随机数提交投保', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(1)
        return bytes
      },
    })
    const submitInsuranceAction = vi
      .fn<ChatSessionValue['submitInsuranceAction']>()
      .mockResolvedValue(SUCCESS_RESPONSE)
    root = renderCard(host, submitInsuranceAction)

    await act(async () => {
      boxCalls.at(-1)?.onAction(ACTION)
      await Promise.resolve()
    })

    expect(submitInsuranceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        ),
      }),
    )
  })

  it('安全随机数同步失败时提示错误、释放提交锁并允许再次点击', async () => {
    vi.stubGlobal('crypto', {})
    const submitInsuranceAction = vi
      .fn<ChatSessionValue['submitInsuranceAction']>()
      .mockResolvedValue(SUCCESS_RESPONSE)
    root = renderCard(host, submitInsuranceAction)

    await act(async () => {
      boxCalls.at(-1)?.onAction(ACTION)
      await Promise.resolve()
    })
    expect(submitInsuranceAction).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      '当前浏览器不支持安全随机数生成',
    )

    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(2)
        return bytes
      },
    })
    await act(async () => {
      boxCalls.at(-1)?.onAction(ACTION)
      await Promise.resolve()
    })

    expect(submitInsuranceAction).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })
})
