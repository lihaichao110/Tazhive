// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SenderProps } from '@ant-design/x'
import type { SenderRef, SlotConfigType } from '@ant-design/x/es/sender'
import type { DropdownProps, MenuProps } from 'antd'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { ChatComposer } from './ChatComposer'

const { clearSenderMock, dropdownCalls, getSenderValueMock, navigateMock, senderCalls } =
  vi.hoisted(() => ({
    clearSenderMock: vi.fn(),
    dropdownCalls: [] as DropdownProps[],
    getSenderValueMock: vi.fn(),
    navigateMock: vi.fn(),
    senderCalls: [] as SenderProps[],
  }))

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
      () =>
        ({
          clear: clearSenderMock,
          getValue: getSenderValueMock,
        }) as unknown as SenderRef,
      [],
    )

    const footer =
      typeof props.footer === 'function'
        ? (props.footer as (node: ReactNode) => ReactNode)(<button>发送</button>)
        : (props.footer as ReactNode)
    return (
      <div>
        {props.header as ReactNode}
        <div data-testid="slots">
          {props.slotConfig?.map((config) => {
            if (config.type === 'text')
              return <span key={`text-${config.value}`}>{config.value}</span>
            if (config.type === 'tag') return <span key={config.key}>{config.props?.label}</span>
            return null
          })}
        </div>
        {footer}
      </div>
    )
  })
  const Header = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>
  return { Sender: Object.assign(Sender, { Header }) }
})

type MenuClickInfo = Parameters<NonNullable<MenuProps['onClick']>>[0]

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

function selectFile(file: File): void {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('文件输入框未渲染')
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })))
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

describe('ChatComposer 附件与更多菜单', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    dropdownCalls.length = 0
    senderCalls.length = 0
    clearSenderMock.mockReset()
    getSenderValueMock.mockReset()
    getSenderValueMock.mockReturnValue({ value: '', slotConfig: [], skill: undefined })
    navigateMock.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('通过附件菜单打开单文件选择器并限制为常用文档和图片', () => {
    renderComposer()
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')
    const pickerButton = host.querySelector<HTMLButtonElement>('[aria-label="添加附件"]')
    const uploadDropdown = getDropdown('upload-file')
    const clickSpy = vi.spyOn(input as HTMLInputElement, 'click')

    expect(pickerButton?.getAttribute('aria-haspopup')).toBe('menu')
    expect(input?.multiple).toBe(false)
    expect(input?.accept).toContain('.pdf')
    expect(input?.accept).toContain('.docx')
    expect(input?.accept).toContain('.png')
    expect(input?.accept).toContain('.jpg')
    expect(uploadDropdown?.placement).toBe('topLeft')

    act(() => uploadDropdown?.menu?.onClick?.({ key: 'upload-file' } as MenuClickInfo))
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('选择新文件时替换旧附件词槽并保留原有文本', () => {
    const textSlot: SlotConfigType = { type: 'text', value: '请总结：' }
    getSenderValueMock.mockReturnValue({ value: '请总结：', slotConfig: [textSlot] })
    renderComposer()

    selectFile(new File(['first'], 'first.pdf', { type: 'application/pdf' }))
    const firstSlots = getLatestSender().slotConfig ?? []
    expect(host.textContent).toContain('first.pdf')
    expect(host.textContent).toContain('文件上传能力待接入')

    getSenderValueMock.mockReturnValue({ value: '请总结：[附件]', slotConfig: firstSlots })
    selectFile(new File(['second'], 'second.png', { type: 'image/png' }))
    const secondSlots = getLatestSender().slotConfig ?? []

    expect(secondSlots.filter((slot) => slot.key === 'chat-attachment')).toHaveLength(1)
    expect(secondSlots.some((slot) => slot.type === 'text' && slot.value === '请总结：')).toBe(true)
    expect(host.textContent).not.toContain('first.pdf')
    expect(host.textContent).toContain('second.png')
  })

  it('可通过词槽按钮移除附件并保留文本', () => {
    const textSlot: SlotConfigType = { type: 'text', value: '草稿' }
    getSenderValueMock.mockReturnValue({ value: '草稿', slotConfig: [textSlot] })
    renderComposer()
    selectFile(new File(['x'], 'report.docx'))
    const slots = getLatestSender().slotConfig ?? []
    getSenderValueMock.mockReturnValue({ value: '草稿[附件]', slotConfig: slots })

    act(() => host.querySelector<HTMLButtonElement>('[aria-label="移除附件 report.docx"]')?.click())

    expect(getLatestSender().slotConfig).toEqual([textSlot])
    expect(host.textContent).not.toContain('report.docx')
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it('退格移除词槽后释放附件并恢复普通文本发送', () => {
    const sendMessage = vi.fn(() => true)
    renderComposer({ sendMessage })
    selectFile(new File(['x'], 'notes.md'))
    const textSlots: SlotConfigType[] = [{ type: 'text', value: '总结一下' }]

    act(() => getLatestSender().onChange?.('总结一下', undefined, textSlots))
    act(() => getLatestSender().onSubmit?.('总结一下', textSlots))

    expect(sendMessage).toHaveBeenCalledWith('总结一下')
    expect(clearSenderMock).toHaveBeenCalledOnce()
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it('存在附件时阻止发送并保留提示', () => {
    const sendMessage = vi.fn(() => true)
    renderComposer({ sendMessage })
    selectFile(new File(['x'], 'data.csv'))
    const slots = getLatestSender().slotConfig ?? []

    act(() => getLatestSender().onSubmit?.('分析数据[附件]', [...slots]))

    expect(sendMessage).not.toHaveBeenCalled()
    expect(clearSenderMock).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('暂时无法随消息发送')
  })

  it('无附件时保持原有文本发送和清空行为', () => {
    const sendMessage = vi.fn(() => true)
    renderComposer({ sendMessage })

    act(() => getLatestSender().onSubmit?.(' 你好 ', []))

    expect(sendMessage).toHaveBeenCalledWith('你好')
    expect(clearSenderMock).toHaveBeenCalledOnce()
  })

  it('回复期间禁用附件入口', () => {
    renderComposer({ isReplying: true })
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')
    const pickerButton = host.querySelector<HTMLButtonElement>('[aria-label="添加附件"]')
    const uploadItem = getDropdown('upload-file')?.menu?.items?.[0]

    expect(input?.disabled).toBe(true)
    expect(pickerButton?.disabled).toBe(true)
    expect(uploadItem && 'disabled' in uploadItem ? uploadItem.disabled : false).toBe(true)
  })

  it('保留更多菜单的知识库导航', () => {
    renderComposer()
    const knowledgeDropdown = getDropdown('knowledge-base')

    knowledgeDropdown?.menu?.onClick?.({ key: 'knowledge-base' } as MenuClickInfo)

    expect(navigateMock).toHaveBeenCalledWith('/knowledge-base')
  })
})
