// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InsuranceCompletion,
  InsuranceConsent,
  InsuranceForm,
  InsuranceGenderRadio,
  InsuranceInput,
  InsuranceRelationshipSelect,
  InsuranceStepIndicator,
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
        <InsuranceForm>
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
        </InsuranceForm>,
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

  it('将字段错误与输入框建立无障碍关联', () => {
    act(() =>
      root.render(
        <InsuranceForm>
          <InsuranceInput
            field="name"
            label="姓名"
            bindingPath="form/name"
            error="请输入真实姓名"
          />
        </InsuranceForm>,
      ),
    )

    const input = host.querySelector('input')
    const error = host.querySelector('[role="alert"]')
    const describedBy = input?.getAttribute('aria-describedby')
    const describedElement = describedBy ? host.querySelector(`#${describedBy}`) : null

    expect(input?.getAttribute('aria-invalid')).toBe('true')
    expect(describedElement?.contains(error)).toBe(true)
    expect(error?.textContent).toBe('请输入真实姓名')
  })

  it('性别单选把选中值写入指定 data model 路径', () => {
    const onDataChange = vi.fn()
    act(() =>
      root.render(
        <InsuranceForm>
          <InsuranceGenderRadio
            label="性别"
            bindingPath="form/gender"
            options={[
              { label: '男', value: 'MALE' },
              { label: '女', value: 'FEMALE' },
            ]}
            onDataChange={onDataChange}
          />
        </InsuranceForm>,
      ),
    )
    const radio = host.querySelector('input[type="radio"][value="MALE"]') as HTMLInputElement
    act(() => radio.click())
    expect(onDataChange).toHaveBeenCalledWith('/form/gender', 'MALE')
  })

  it('关系选择只写关系路径，不再联动字段禁用', () => {
    const onDataChange = vi.fn()
    act(() =>
      root.render(
        <InsuranceForm>
          <InsuranceRelationshipSelect
            label="投保人是被保人的"
            bindingPath="form/relationship"
            options={[{ label: '本人', value: 'SELF' }]}
            onDataChange={onDataChange}
          />
        </InsuranceForm>,
      ),
    )
    const select = host.querySelector('select') as HTMLSelectElement
    act(() => {
      select.value = 'SELF'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onDataChange).toHaveBeenCalledWith('/form/relationship', 'SELF')
    expect(onDataChange).toHaveBeenCalledTimes(1)
  })

  it('提交按钮只发送动作名称，不自行拼接个人资料', async () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <InsuranceForm>
          <InsuranceSubmitButton
            text="提交"
            action={{ event: { name: 'applicant_submit' } }}
            onAction={onAction}
          />
        </InsuranceForm>,
      ),
    )
    await act(async () => host.querySelector('button')?.click())
    expect(onAction).toHaveBeenCalledWith('applicant_submit', {})
  })

  it('前端校验失败时阻止提交并显示字段错误', async () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <InsuranceForm>
          <InsuranceInput field="mobile" label="手机号" bindingPath="form/mobile" />
          <InsuranceSubmitButton
            text="下一步"
            action={{ event: { name: 'applicant_submit' } }}
            onAction={onAction}
          />
        </InsuranceForm>,
      ),
    )

    await act(async () => {
      host.querySelector('button')?.click()
      await Promise.resolve()
    })

    expect(onAction).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(host.textContent).toContain('请输入手机号'))
  })

  it('展示固定四步进度及仅含投保单号的完成页', () => {
    act(() =>
      root.render(
        <>
          <InsuranceStepIndicator current={3} total={4} title="信息确认" />
          <InsuranceCompletion applicationId="APP-001" />
        </>,
      ),
    )

    // 断言限定在完成页容器内，避免步骤指示器的“投保人信息/被保险人信息”文案干扰。
    const completion = host.querySelector('[role="status"]')
    expect(completion?.textContent).toContain('投保单号')
    expect(completion?.textContent).toContain('投保资料提交成功')
    expect(completion?.textContent).toContain('APP-001')
    expect(completion?.textContent).not.toContain('投保方案')
    expect(completion?.textContent).not.toContain('投保人')
    expect(completion?.textContent).not.toContain('被保险人')
    expect(host.querySelector('button')?.disabled).toBe(true)
  })
})
