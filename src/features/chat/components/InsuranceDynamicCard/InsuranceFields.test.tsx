// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InsuranceDateField,
  InsuranceForm,
  InsuranceGenderField,
  InsuranceSubmitButton,
  InsuranceTextField,
} from './InsuranceFields'

let host: HTMLDivElement
let root: Root

function changeInput(selector: string, value: string): void {
  const input = host.querySelector<HTMLInputElement>(selector)
  if (!input) throw new Error(`找不到输入框：${selector}`)
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function renderForm(onAction = vi.fn()) {
  act(() => {
    root.render(
      <InsuranceForm>
        <InsuranceTextField
          name="name"
          label="姓名"
          bindingPath="insurance/name"
          minLength={2}
          maxLength={30}
        />
        <InsuranceDateField name="birthDate" label="出生日期" bindingPath="insurance/birthDate" />
        <InsuranceGenderField
          name="gender"
          label="性别"
          bindingPath="insurance/gender"
          options={[
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
          ]}
        />
        <InsuranceTextField name="phone" label="手机号" bindingPath="insurance/phone" />
        <InsuranceSubmitButton text="提交投保信息" onAction={onAction} />
      </InsuranceForm>,
    )
  })
  return onAction
}

describe('InsuranceFields', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('空表单与非法字段不会触发提交', async () => {
    const onAction = renderForm()

    await act(async () => {
      host.querySelector<HTMLButtonElement>('button')?.click()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(onAction).not.toHaveBeenCalled()
    expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false)
  })

  it('合法数据只触发一次提交并锁定按钮', async () => {
    const onAction = renderForm()

    await act(async () => {
      changeInput('#name', ' 张三 ')
      changeInput('#birthDate', '1990-01-01')
      host.querySelector<HTMLInputElement>('input[value="male"]')?.click()
      changeInput('#phone', '13800138000')
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button')?.click()
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith('insurance.submit', {
      insurance: {
        name: '张三',
        birthDate: '1990-01-01',
        gender: 'male',
        phone: '13800138000',
      },
    })
    expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
  })
})
