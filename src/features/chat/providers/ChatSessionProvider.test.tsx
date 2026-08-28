// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatSessionProvider } from './ChatSessionProvider'
import { useChatSession } from './useChatSession'

const chatMocks = vi.hoisted(() => ({
  abort: vi.fn(),
  retry: vi.fn(),
  send: vi.fn(),
  setMode: vi.fn(),
  submitInsurance: vi.fn(),
}))

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    isReplying: false,
    error: null,
    mode: 'fast',
    ...chatMocks,
  }),
}))

const QUOTE = { messageId: 'assistant-1', role: 'assistant', text: '被引用内容' } as const
const INSURANCE = {
  name: '张三',
  birthDate: '1990-01-01',
  gender: 'male',
  phone: '13800138000',
} as const

function SessionHarness() {
  const session = useChatSession()
  return (
    <div>
      <span data-quote>{session.quote?.text ?? '无引用'}</span>
      <button type="button" onClick={() => session.selectQuote(QUOTE)}>
        选择引用
      </button>
      <button type="button" onClick={session.clearQuote}>
        清除引用
      </button>
      <button type="button" onClick={() => session.sendMessage('继续解释')}>
        发送
      </button>
      <button type="button" onClick={() => session.submitInsurance(INSURANCE)}>
        提交投保
      </button>
    </div>
  )
}

function click(host: HTMLElement, label: string): void {
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent === label)
  if (!button) throw new Error(`未找到测试按钮：${label}`)
  act(() => button.click())
}

describe('ChatSessionProvider', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
    act(() => {
      root.render(
        <ChatSessionProvider>
          <SessionHarness />
        </ChatSessionProvider>,
      )
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('支持选择和主动清除引用', () => {
    click(host, '选择引用')
    expect(host.querySelector('[data-quote]')?.textContent).toBe('被引用内容')

    click(host, '清除引用')
    expect(host.querySelector('[data-quote]')?.textContent).toBe('无引用')
  })

  it('发送成功后清除引用并把引用写入发送参数', () => {
    chatMocks.send.mockReturnValue(true)
    click(host, '选择引用')
    click(host, '发送')

    expect(chatMocks.send).toHaveBeenCalledWith('继续解释', QUOTE)
    expect(host.querySelector('[data-quote]')?.textContent).toBe('无引用')
  })

  it('发送被拒绝时保留引用供用户重试', () => {
    chatMocks.send.mockReturnValue(false)
    click(host, '选择引用')
    click(host, '发送')

    expect(host.querySelector('[data-quote]')?.textContent).toBe('被引用内容')
  })

  it('将投保提交交给会话控制 Hook', () => {
    click(host, '提交投保')
    expect(chatMocks.submitInsurance).toHaveBeenCalledWith(INSURANCE)
  })
})
