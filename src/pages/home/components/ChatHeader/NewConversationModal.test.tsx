// @vitest-environment happy-dom

import { act, type InputHTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NewConversationModal } from './NewConversationModal'

interface MockModalProps {
  readonly children: ReactNode
  readonly okButtonProps?: { readonly disabled?: boolean }
  readonly open?: boolean
  readonly onCancel?: () => void
  readonly onOk?: () => void
}

interface MockInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly onPressEnter?: () => void
}

vi.mock('antd', () => ({
  Input: ({ onPressEnter, ...props }: MockInputProps) => (
    <input
      {...props}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onPressEnter?.()
      }}
    />
  ),
  Modal: ({ children, okButtonProps, open, onCancel, onOk }: MockModalProps) =>
    open ? (
      <div role="dialog">
        {children}
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="button" disabled={okButtonProps?.disabled} onClick={onOk}>
          确认
        </button>
      </div>
    ) : null,
}))

let host: HTMLDivElement
let root: Root

function changeTitle(value: string): void {
  const input = host.querySelector<HTMLInputElement>('input')
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input?.dispatchEvent(new Event('input', { bubbles: true }))
  input?.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('NewConversationModal', () => {
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

  it('禁用空白标题并通过回车提交去除空格后的标题', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(<NewConversationModal isOpen onCancel={() => undefined} onConfirm={onConfirm} />)
    })

    const confirmButton = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === '确认',
    )
    expect(confirmButton?.disabled).toBe(true)

    act(() => changeTitle('  新项目讨论  '))
    expect(confirmButton?.disabled).toBe(false)
    act(() => {
      host
        .querySelector('input')
        ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    })

    expect(onConfirm).toHaveBeenCalledWith('新项目讨论')
  })

  it('取消后清空未提交标题', () => {
    const onCancel = vi.fn()
    const renderModal = (isOpen: boolean) => {
      root.render(
        <NewConversationModal isOpen={isOpen} onCancel={onCancel} onConfirm={() => undefined} />,
      )
    }
    act(() => renderModal(true))
    act(() => changeTitle('临时标题'))
    const cancelButton = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === '取消',
    )
    act(() => cancelButton?.click())
    act(() => renderModal(false))
    act(() => renderModal(true))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(host.querySelector<HTMLInputElement>('input')?.value).toBe('')
  })
})
