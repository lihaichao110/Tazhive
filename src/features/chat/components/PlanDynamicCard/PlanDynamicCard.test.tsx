// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActionPayload } from '@ant-design/x-card'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { DynamicCardHostProvider } from '../../providers/DynamicCardHostProvider'
import { PlanDynamicCard } from './PlanDynamicCard'

interface BoxProps {
  readonly children: ReactNode
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

  it('上报卡片元素并将合法方案动作交给当前会话', () => {
    const onReady = vi.fn()
    const submitCardAction = vi.fn()
    const view = (
      <ChatSessionTestProvider value={{ submitCardAction }}>
        <DynamicCardHostProvider onReady={onReady}>
          <PlanDynamicCard card={CARD} />
        </DynamicCardHostProvider>
      </ChatSessionTestProvider>
    )

    act(() => root.render(view))
    act(() => root.render(view))

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(onReady).toHaveBeenCalledWith('plans-1', expect.any(HTMLDivElement))

    act(() => {
      boxCalls.at(-1)?.onAction({
        name: 'plan_apply',
        surfaceId: 'plans-1',
        context: CONTEXT,
      })
    })
    expect(submitCardAction).toHaveBeenCalledWith({
      name: 'plan_apply',
      surfaceId: 'plans-1',
      context: CONTEXT,
    })
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
})
