// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InsuranceConsent,
  InsuranceInput,
  InsuranceRelationshipSelect,
  InsuranceSubmitButton,
} from './InsuranceComponents'

describe('InsuranceComponents', () => {
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

  it('将身份输入和授权状态写入指定 data model 路径', () => {
    const onDataChange = vi.fn()
    act(() =>
      root.render(
        <>
          <InsuranceInput
            field="name"
            label="姓名"
            bindingPath="form/name"
            value=""
            onDataChange={onDataChange}
          />
          <InsuranceConsent
            text="同意授权"
            bindingPath="form/consent"
            onDataChange={onDataChange}
          />
        </>,
      ),
    )
    const input = host.querySelector('input[type="text"]') as HTMLInputElement
    const checkbox = host.querySelector('input[type="checkbox"]') as HTMLInputElement
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, '张三')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      checkbox.click()
    })
    expect(onDataChange).toHaveBeenCalledWith('/form/name', '张三')
    expect(onDataChange).toHaveBeenCalledWith('/form/consent', true)
  })

  it('选择本人时锁定身份字段标记', () => {
    const onDataChange = vi.fn()
    act(() =>
      root.render(
        <InsuranceRelationshipSelect
          label="关系"
          bindingPath="form/relationship"
          options={[{ label: '本人', value: 'SELF' }]}
          onDataChange={onDataChange}
        />,
      ),
    )
    const select = host.querySelector('select') as HTMLSelectElement
    act(() => {
      select.value = 'SELF'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onDataChange).toHaveBeenCalledWith('/form/relationship', 'SELF')
    expect(onDataChange).toHaveBeenCalledWith('/ui/person_fields_disabled', true)
  })

  it('提交按钮只发送动作名称，不自行拼接个人资料', () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <InsuranceSubmitButton
          text="提交"
          action={{ event: { name: 'applicant_submit' } }}
          onAction={onAction}
        />,
      ),
    )
    act(() => host.querySelector('button')?.click())
    expect(onAction).toHaveBeenCalledWith('applicant_submit', {})
  })
})
