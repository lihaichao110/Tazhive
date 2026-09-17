// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage, DynamicCardMessageContent } from '../../model/types'
import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { DynamicCardHostProvider } from '../../providers/DynamicCardHostProvider'
import { applicantCard, insuredCard } from './insuranceCardFixtures'
import { PlanDynamicCard } from './PlanDynamicCard'

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

  it('提交成功并追加更高步骤卡片后，旧表单保留已填数据且禁用', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const submitInsuranceAction = vi.fn().mockResolvedValue({ outcome: 'advanced' })
    const render = (card: DynamicCardMessageContent, messages: readonly ChatMessage[]): void =>
      act(() =>
        root.render(
          <ChatSessionTestProvider value={{ messages, submitInsuranceAction }}>
            <DynamicCardHostProvider onReady={() => undefined}>
              <PlanDynamicCard card={card} />
            </DynamicCardHostProvider>
          </ChatSessionTestProvider>,
        ),
      )

    const applicant = applicantCard('ins-1')
    render(applicant, [])
    await vi.waitFor(() => expect(host.querySelector('input[name="name"]')).toBeTruthy())

    await act(async () => {
      ;(host.querySelector('input[type="radio"][value="MALE"]') as HTMLInputElement).click()
      setInputValue(host, 'input[name="name"]', '张三')
      setInputValue(host, 'input[name="mobile"]', '13800138000')
      setSelectValue(host, 'select', 'SPOUSE')
      ;(host.querySelector('input[type="checkbox"]') as HTMLInputElement).click()
    })

    await act(async () => {
      ;(host.querySelector('button') as HTMLButtonElement).click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(submitInsuranceAction).toHaveBeenCalledTimes(1)

    // 服务端按步骤追加被保人卡片消息，投保人卡陈旧化并重放服务端空种子。
    render(applicant, [
      { id: 'm-1', role: 'assistant', content: [applicant], status: 'success' },
      { id: 'm-2', role: 'assistant', content: [insuredCard('ins-2')], status: 'success' },
    ])

    // 回归：陈旧重放后表单数据不得被空种子清掉，字段与按钮全部禁用。
    await vi.waitFor(() => {
      expect((host.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('张三')
      expect((host.querySelector('input[name="mobile"]') as HTMLInputElement).value).toBe(
        '13800138000',
      )
    })
    expect((host.querySelector('input[name="name"]') as HTMLInputElement).disabled).toBe(true)
    expect((host.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBe(true)
    expect((host.querySelector('button') as HTMLButtonElement).disabled).toBe(true)
    expect(host.textContent).toContain('已提交')
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
