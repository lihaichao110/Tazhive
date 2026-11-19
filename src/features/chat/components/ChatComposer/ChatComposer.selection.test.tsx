// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SenderProps } from '@ant-design/x'
import type { SenderRef } from '@ant-design/x/es/sender'
import type { ActionsComponents } from '@ant-design/x/es/sender/interface'
import type { DropdownProps } from 'antd'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { ChatComposer } from './ChatComposer'

const mockActionComponents: ActionsComponents = {
  SendButton: ({ disabled }) => <button disabled={disabled}>发送</button>,
  ClearButton: () => <button>清空</button>,
  LoadingButton: () => <button>停止</button>,
  SpeechButton: () => <button>语音</button>,
}

const { dropdownCalls, uploadMock } = vi.hoisted(() => ({
  dropdownCalls: [] as DropdownProps[],
  uploadMock: vi.fn(),
}))

vi.mock('../../api/uploadChatImage', () => ({ uploadChatImage: uploadMock }))

vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }))

vi.mock('antd', () => ({
  Dropdown: (props: DropdownProps) => {
    dropdownCalls.push(props)
    return <>{props.children}</>
  },
}))

vi.mock('@ant-design/x', async () => {
  const React = await import('react')
  const Sender = React.forwardRef<SenderRef, SenderProps>((props, ref) => {
    React.useImperativeHandle(
      ref,
      () => ({ blur: vi.fn(), clear: vi.fn() }) as unknown as SenderRef,
      [],
    )
    const footer =
      typeof props.footer === 'function'
        ? (
            props.footer as (
              node: ReactNode,
              info: { readonly components: ActionsComponents },
            ) => ReactNode
          )(<button>发送</button>, { components: mockActionComponents })
        : (props.footer as ReactNode)
    return (
      <div>
        {props.header as ReactNode}
        <textarea value={props.value} onChange={(event) => props.onChange?.(event.target.value)} />
        {footer}
      </div>
    )
  })
  return {
    Sender: Object.assign(Sender, {
      Header: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    }),
  }
})

const NativeURL = URL

class TestURL extends NativeURL {
  static createObjectURL = vi.fn(() => `blob:test-${Math.random()}`)
  static revokeObjectURL = vi.fn()
}

let host: HTMLDivElement
let root: Root

function selectFiles(files: readonly File[]): void {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('图片选择器未渲染')
  Object.defineProperty(input, 'files', { configurable: true, value: files })
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })))
}

function renderComposer(): void {
  act(() =>
    root.render(
      <ChatSessionTestProvider>
        <ChatComposer />
      </ChatSessionTestProvider>,
    ),
  )
}

describe('ChatComposer 图片选择', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    dropdownCalls.length = 0
    vi.stubGlobal('URL', TestURL)
    uploadMock.mockReset()
    uploadMock.mockImplementation(async (file: File) => ({
      object_key: `chat-images/${file.name}`,
      file_url: `https://images.example.com/${file.name}`,
      file_type: file.type.split('/')[1] ?? '',
    }))
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('允许多选并限制为每条消息最多三张，选中后立即上传', async () => {
    renderComposer()
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input?.multiple).toBe(true)
    expect(input?.accept).toBe('image/jpeg,image/png,image/gif,image/webp')

    await act(async () =>
      selectFiles([
        new File(['1'], 'one.png', { type: 'image/png' }),
        new File(['2'], 'two.jpg', { type: 'image/jpeg' }),
        new File(['3'], 'three.webp', { type: 'image/webp' }),
        new File(['4'], 'four.gif', { type: 'image/gif' }),
      ]),
    )

    expect(host.querySelectorAll('[aria-label^="移除图片"]')).toHaveLength(3)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('最多添加 3 张')
    expect(uploadMock).toHaveBeenCalledTimes(3)
  })

  it('只接受后端支持的图片格式并允许移除已选预览', async () => {
    renderComposer()
    await act(async () =>
      selectFiles([
        new File(['x'], 'photo.png', { type: 'image/png' }),
        new File(['x'], 'photo.bmp', { type: 'image/bmp' }),
        new File(['x'], 'notes.txt', { type: 'text/plain' }),
      ]),
    )

    expect(host.querySelectorAll('img[alt="photo.png"]')).toHaveLength(1)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      '仅支持 JPEG、PNG、GIF 或 WebP',
    )
    expect(uploadMock).toHaveBeenCalledOnce()
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="移除图片 photo.png"]')?.click())
    expect(host.querySelectorAll('img[alt="photo.png"]')).toHaveLength(0)
  })
})
