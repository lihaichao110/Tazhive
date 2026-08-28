import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { MessageSelectionActions } from './MessageSelectionActions'

interface SelectionState {
  isCollapsed: boolean
  rangeCount: number
  text: string
}

export interface SelectionActionsRenderResult {
  readonly host: HTMLDivElement
  readonly onQuoteSelect: ReturnType<typeof vi.fn>
  readonly root: Root
  readonly selectionState: SelectionState
}

// 渲染带真实 DOM 节点的组件，并用可变选区模拟移动端异步选择过程。
export function renderSelectionActions(children?: ReactNode): SelectionActionsRenderResult {
  const host = document.createElement('div')
  const root = createRoot(host)
  const onQuoteSelect = vi.fn()
  const selectionState: SelectionState = {
    isCollapsed: false,
    rangeCount: 1,
    text: '移动端选区',
  }

  document.body.append(host)
  act(() => {
    root.render(
      <ChatSessionTestProvider value={{ selectQuote: onQuoteSelect }}>
        <MessageSelectionActions enabled messageId="assistant-1" role="assistant">
          {children ?? <p data-quotable-text>移动端选区内容</p>}
        </MessageSelectionActions>
      </ChatSessionTestProvider>,
    )
  })

  const textRoot = host.querySelector('[data-quotable-text]')
  const textNode = textRoot?.firstChild
  if (!textRoot || !textNode) throw new Error('测试文本节点未渲染')

  const range = {
    endContainer: textNode,
    getBoundingClientRect: vi.fn(
      () =>
        ({
          bottom: 120,
          height: 20,
          left: 40,
          right: 160,
          top: 100,
          width: 120,
        }) as DOMRect,
    ),
    startContainer: textNode,
  }
  vi.spyOn(window, 'getSelection').mockImplementation(
    () =>
      ({
        addRange: vi.fn(),
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: vi.fn(() => range),
        isCollapsed: selectionState.isCollapsed,
        rangeCount: selectionState.rangeCount,
        removeAllRanges: vi.fn(),
        toString: vi.fn(() => selectionState.text),
      }) as unknown as Selection,
  )

  return { host, onQuoteSelect, root, selectionState }
}

export function settleSelection(): void {
  act(() => {
    document.dispatchEvent(new Event('selectionchange'))
    vi.advanceTimersByTime(80)
  })
}

// 模拟 Android 在按钮点击前先折叠原生选区，且可能不派发 click 的触摸顺序。
export async function pressAndroidButton(
  environment: SelectionActionsRenderResult,
  button: HTMLButtonElement,
): Promise<PointerEvent> {
  const pointerDown = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    pointerType: 'touch',
  })

  await act(async () => {
    button.dispatchEvent(pointerDown)
    environment.selectionState.isCollapsed = true
    document.dispatchEvent(new Event('selectionchange'))
    button.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, isPrimary: true, pointerType: 'touch' }),
    )
    button.dispatchEvent(new Event('touchend', { bubbles: true }))
    await Promise.resolve()
    vi.advanceTimersByTime(80)
  })

  return pointerDown
}
