// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SenderProps } from '@ant-design/x'
import type { SenderRef } from '@ant-design/x/es/sender'
import type { ActionsComponents } from '@ant-design/x/es/sender/interface'
import type { DropdownProps, MenuProps } from 'antd'

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }))

vi.mock('../../api/uploadChatImage', () => ({ uploadChatImage: uploadMock }))

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { ChatComposer } from './ChatComposer'

const mockActionComponents: ActionsComponents = {
  SendButton: ({ disabled }) => (
    <button data-testid="send-action" disabled={disabled}>
      发送
    </button>
  ),
  ClearButton: () => <button>清空</button>,
  LoadingButton: () => <button>停止</button>,
  SpeechButton: () => <button>语音</button>,
}

const { blurSenderMock, clearSenderMock, dropdownCalls, navigateMock, senderCalls } = vi.hoisted(
  () => ({
    blurSenderMock: vi.fn(),
    clearSenderMock: vi.fn(),
    dropdownCalls: [] as DropdownProps[],
    navigateMock: vi.fn(),
    senderCalls: [] as SenderProps[],
  }),
)

vi.mock('react-router', () => ({ useNavigate: () => navigateMock }))

vi.mock('antd', () => ({
  Dropdown: (props: DropdownProps) => {
    dropdownCalls.push(props)
    return <>{props.children}</>
  },
}))

vi.mock('@ant-design/x', async () => {
  const React = await import('react')
  const Sender = React.forwardRef<SenderRef, SenderProps>((props, ref) => {
    senderCalls.push(props)
    React.useImperativeHandle(
      ref,
      () => ({ blur: blurSenderMock, clear: clearSenderMock }) as unknown as SenderRef,
      [],
    )
    const footer =
      typeof props.footer === 'function'
        ? (
            props.footer as (
              node: ReactNode,
              info: { readonly components: ActionsComponents },
            ) => ReactNode
          )(<button>发送</button>, {
            components: mockActionComponents,
          })
        : (props.footer as ReactNode)
    return (
      <div>
        {props.header as ReactNode}
        <textarea value={props.value} onChange={(event) => props.onChange?.(event.target.value)} />
        {footer}
      </div>
    )
  })
  const Header = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>
  return { Sender: Object.assign(Sender, { Header }) }
})

type MenuClickInfo = Parameters<NonNullable<MenuProps['onClick']>>[0]
const NativeURL = URL

class TestURL extends NativeURL {
  static createObjectURL = vi.fn(() => `blob:test-${Math.random()}`)
  static revokeObjectURL = vi.fn()
}

let host: HTMLDivElement
let root: Root

function getDropdown(itemKey: string): DropdownProps | undefined {
  return dropdownCalls.find((call) =>
    call.menu?.items?.some((item) => item && 'key' in item && item.key === itemKey),
  )
}

function getLatestSender(): SenderProps {
  const sender = senderCalls.at(-1)
  if (!sender) throw new Error('Sender 未渲染')
  return sender
}

function selectFiles(files: readonly File[]): void {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('图片选择器未渲染')
  Object.defineProperty(input, 'files', { configurable: true, value: files })
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })))
}

function mockUpload(
  fileUrl: string,
  extension: string,
  objectKey = `chat-images/photo.${extension}`,
): void {
  uploadMock.mockResolvedValueOnce({
    object_key: objectKey,
    file_url: fileUrl,
    file_type: extension,
  })
}

function renderComposer(value?: Parameters<typeof ChatSessionTestProvider>[0]['value']): void {
  act(() =>
    root.render(
      <ChatSessionTestProvider value={value}>
        <ChatComposer />
      </ChatSessionTestProvider>,
    ),
  )
}

describe('ChatComposer 图片附件', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    dropdownCalls.length = 0
    senderCalls.length = 0
    blurSenderMock.mockReset()
    clearSenderMock.mockReset()
    navigateMock.mockReset()
    uploadMock.mockReset()
    TestURL.createObjectURL.mockClear()
    TestURL.revokeObjectURL.mockClear()
    vi.stubGlobal('URL', TestURL)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('文字必填，选图即上传且聊天请求复用响应 key、URL 和扩展名', async () => {
    const sendMessage = vi.fn(async () => true)
    mockUpload('https://images.example.com/chat-images/photo.png', 'png')
    renderComposer({ sendMessage })
    const previewSelector = '[aria-label="待发送图片"]'
    expect(host.querySelector(previewSelector)).toBeNull()

    await act(async () => selectFiles([new File(['x'], 'photo.PNG', { type: 'image/png' })]))
    expect(uploadMock).toHaveBeenCalledOnce()
    expect(host.querySelector('[role="status"]')?.textContent).toBe('已上传')
    const orderedElements = host.querySelectorAll(
      `${previewSelector}, textarea, [data-testid="send-action"]`,
    )
    expect(Array.from(orderedElements, (element) => element.tagName)).toEqual([
      'DIV',
      'TEXTAREA',
      'BUTTON',
    ])

    await act(async () => getLatestSender().onSubmit?.('   '))
    expect(sendMessage).not.toHaveBeenCalled()

    await act(async () => getLatestSender().onSubmit?.('描述图片'))
    expect(sendMessage).toHaveBeenCalledWith('描述图片', [
      {
        object_key: 'chat-images/photo.png',
        file_url: 'https://images.example.com/chat-images/photo.png',
        file_type: 'png',
      },
    ])
    expect(uploadMock).toHaveBeenCalledOnce()
    expect(clearSenderMock).toHaveBeenCalledOnce()
    expect(host.querySelector(previewSelector)).toBeNull()
  })

  it('图片上传进行中时禁用发送', async () => {
    let resolveUpload: (image: {
      object_key: string
      file_url: string
      file_type: string
    }) => void = () => undefined
    const pendingUpload = new Promise<{
      object_key: string
      file_url: string
      file_type: string
    }>((resolve) => {
      resolveUpload = resolve
    })
    uploadMock.mockReturnValueOnce(pendingUpload)
    renderComposer()
    await act(async () => selectFiles([new File(['x'], 'photo.png', { type: 'image/png' })]))
    act(() => getLatestSender().onChange?.('描述图片'))

    expect(host.querySelector('[role="status"]')?.textContent).toBe('上传中…')
    expect(host.querySelector<HTMLButtonElement>('[data-testid="send-action"]')?.disabled).toBe(
      true,
    )

    await act(async () => {
      resolveUpload({
        object_key: 'chat-images/photo.png',
        file_url: 'https://images.example.com/photo.png',
        file_type: 'png',
      })
      await pendingUpload
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(host.querySelector('[role="status"]')?.textContent).toBe('已上传')
  })

  it('聊天请求未接受时保留文字和图片供重试且不重复上传', async () => {
    const sendMessage = vi.fn(async () => false)
    mockUpload('https://images.example.com/photo.jpeg', 'jpeg')
    renderComposer({ sendMessage })
    await act(async () => selectFiles([new File(['x'], 'photo.jpeg', { type: 'image/jpeg' })]))
    act(() => getLatestSender().onChange?.('说明一下'))

    await act(async () => getLatestSender().onSubmit?.('说明一下'))

    expect(sendMessage).toHaveBeenCalledWith('说明一下', [
      {
        object_key: 'chat-images/photo.jpeg',
        file_url: 'https://images.example.com/photo.jpeg',
        file_type: 'jpeg',
      },
    ])
    expect(clearSenderMock).not.toHaveBeenCalled()
    expect(host.querySelectorAll('[aria-label^="移除图片"]')).toHaveLength(1)
    expect(getLatestSender().value).toBe('说明一下')
    expect(uploadMock).toHaveBeenCalledOnce()
  })

  it('上传失败时禁止发送，并可重试上传后继续发送', async () => {
    const sendMessage = vi.fn(async () => true)
    uploadMock.mockRejectedValueOnce(new Error('上传失败')).mockResolvedValueOnce({
      object_key: 'chat-images/retried.png',
      file_url: 'https://images.example.com/retried.png',
      file_type: 'png',
    })
    renderComposer({ sendMessage })
    await act(async () => selectFiles([new File(['x'], 'photo.png', { type: 'image/png' })]))
    act(() => getLatestSender().onChange?.('描述图片'))

    expect(sendMessage).not.toHaveBeenCalled()
    expect(host.querySelector('[role="status"]')?.textContent).toBe('上传失败')
    expect(host.querySelectorAll('[aria-label^="移除图片"]').length).toBe(1)
    expect(host.querySelector<HTMLButtonElement>('[data-testid="send-action"]')?.disabled).toBe(
      true,
    )
    expect(getLatestSender().value).toBe('描述图片')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="重试上传图片 photo.png"]')?.click(),
    )
    expect(host.querySelector('[role="status"]')?.textContent).toBe('已上传')
    await act(async () => getLatestSender().onSubmit?.('描述图片'))
    expect(sendMessage).toHaveBeenCalledWith('描述图片', [
      {
        object_key: 'chat-images/retried.png',
        file_url: 'https://images.example.com/retried.png',
        file_type: 'png',
      },
    ])
    expect(uploadMock).toHaveBeenCalledTimes(2)
  })

  it('保留知识库导航', () => {
    renderComposer()
    getDropdown('knowledge-base')?.menu?.onClick?.({ key: 'knowledge-base' } as MenuClickInfo)
    expect(navigateMock).toHaveBeenCalledWith('/knowledge-base')
  })
})
