// @vitest-environment happy-dom

import { act, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginDrawer } from './LoginDrawer'

interface MockButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  readonly block?: boolean
  readonly htmlType?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  readonly loading?: boolean
  readonly type?: string
}

interface MockDrawerProps {
  readonly children: ReactNode
  readonly closable?: boolean
  readonly keyboard?: boolean
  readonly mask?: { readonly closable?: boolean }
  readonly open?: boolean
  readonly placement?: string
  readonly onClose?: () => void
}

vi.mock('antd', () => {
  const MockInput = Object.assign(
    (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    {
      Password: (props: InputHTMLAttributes<HTMLInputElement>) => (
        <input type="password" {...props} />
      ),
    },
  )

  return {
    Button: ({ block: _block, htmlType, loading, type: _type, ...props }: MockButtonProps) => (
      <button type={htmlType} data-loading={String(Boolean(loading))} {...props} />
    ),
    Drawer: ({ children, closable, keyboard, mask, open, placement, onClose }: MockDrawerProps) =>
      open ? (
        <div
          role="dialog"
          data-closable={String(closable)}
          data-keyboard={String(keyboard)}
          data-mask-closable={String(mask?.closable)}
          data-placement={placement}
        >
          {children}
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      ) : null,
    Input: MockInput,
  }
})

let host: HTMLDivElement
let root: Root

function changeInput(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('LoginDrawer', () => {
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

  it('从底部打开并使用默认凭证登录', async () => {
    const onLogin = vi.fn(async () => undefined)
    act(() => {
      root.render(
        <LoginDrawer
          error={null}
          isLoggingIn={false}
          isOpen
          onClose={() => undefined}
          onLogin={onLogin}
        />,
      )
    })

    expect(host.querySelector('[role="dialog"]')?.getAttribute('data-placement')).toBe('bottom')
    const inputs = host.querySelectorAll<HTMLInputElement>('input')
    expect(inputs[0]?.value).toBe('lihaichao')
    expect(inputs[1]?.value).toBe('lihaichao')
    expect(inputs[1]?.type).toBe('password')

    await act(async () => {
      host.querySelector<HTMLFormElement>('form')?.requestSubmit()
    })

    expect(onLogin).toHaveBeenCalledWith({ username: 'lihaichao', password: 'lihaichao' })
  })

  it('允许编辑凭证，账号去除首尾空格后提交', async () => {
    const onLogin = vi.fn(async () => undefined)
    act(() => {
      root.render(
        <LoginDrawer
          error={null}
          isLoggingIn={false}
          isOpen
          onClose={() => undefined}
          onLogin={onLogin}
        />,
      )
    })

    const inputs = host.querySelectorAll<HTMLInputElement>('input')
    act(() => {
      changeInput(inputs[0], '  custom-user  ')
      changeInput(inputs[1], 'custom-password')
    })
    await act(async () => {
      host.querySelector<HTMLFormElement>('form')?.requestSubmit()
    })

    expect(onLogin).toHaveBeenCalledWith({
      username: 'custom-user',
      password: 'custom-password',
    })
  })

  it('空白字段禁止提交，登录中锁定表单和关闭操作', () => {
    const onClose = vi.fn()
    const onLogin = vi.fn(async () => undefined)
    const renderDrawer = (isLoggingIn: boolean) => {
      root.render(
        <LoginDrawer
          error="账号或密码错误"
          isLoggingIn={isLoggingIn}
          isOpen
          onClose={onClose}
          onLogin={onLogin}
        />,
      )
    }
    act(() => renderDrawer(false))
    const inputs = host.querySelectorAll<HTMLInputElement>('input')
    act(() => changeInput(inputs[0], '   '))
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('账号或密码错误')

    act(() => renderDrawer(true))
    expect(host.querySelector('[role="dialog"]')?.getAttribute('data-closable')).toBe('false')
    expect(host.querySelector('[role="dialog"]')?.getAttribute('data-keyboard')).toBe('false')
    expect(host.querySelectorAll<HTMLInputElement>('input')[0]?.disabled).toBe(true)
    act(() => {
      ;[...host.querySelectorAll('button')].find((button) => button.textContent === '关闭')?.click()
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
