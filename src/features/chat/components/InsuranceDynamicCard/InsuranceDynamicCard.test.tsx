// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActionPayload } from '@ant-design/x-card'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { DynamicCardHostProvider } from '../../providers/DynamicCardHostProvider'
import { InsuranceDynamicCard } from './InsuranceDynamicCard'

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

const CARD = { type: 'dynamic-card', surfaceId: 'surface-1', commands: [] } as const
const INSURANCE = {
  name: '张三',
  birthDate: '1990-01-01',
  gender: 'male',
  phone: '13800138000',
} as const

describe('InsuranceDynamicCard', () => {
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

  it('向宿主上报卡片元素并将合法投保动作交给会话', () => {
    const onReady = vi.fn()
    const submitInsurance = vi.fn()
    const view = (
      <ChatSessionTestProvider value={{ submitInsurance }}>
        <DynamicCardHostProvider onReady={onReady}>
          <InsuranceDynamicCard card={CARD} />
        </DynamicCardHostProvider>
      </ChatSessionTestProvider>
    )

    act(() => root.render(view))
    act(() => root.render(view))

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(onReady).toHaveBeenCalledWith('surface-1', expect.any(HTMLDivElement))

    act(() => {
      boxCalls.at(-1)?.onAction({
        name: 'insurance.submit',
        surfaceId: 'surface-1',
        context: { insurance: INSURANCE },
      } as ActionPayload)
    })
    expect(submitInsurance).toHaveBeenCalledWith(INSURANCE)
  })
})
