// @vitest-environment happy-dom

import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMobileViewportLayout } from './useMobileViewportLayout'

class VisualViewportStub extends EventTarget {
  height = 780
  offsetLeft = 0
  offsetTop = 0
}

function TestPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  useMobileViewportLayout(pageRef)

  return (
    <div ref={pageRef} data-testid="page">
      <div data-testid="editor" contentEditable />
      <textarea data-testid="second-editor" />
      <div data-testid="message-scroll" />
    </div>
  )
}

let host: HTMLDivElement
let root: Root
let viewport: VisualViewportStub
let pageScrollX: number
let pageScrollY: number
let scrollToMock: ReturnType<typeof vi.fn>

function getElement(testId: string): HTMLElement {
  const element = host.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`找不到测试元素：${testId}`)
  return element
}

function dispatchFocusEvent(
  target: HTMLElement,
  type: 'focusin' | 'focusout',
  relatedTarget: EventTarget | null = null,
): void {
  target.dispatchEvent(new FocusEvent(type, { bubbles: true, relatedTarget }))
}

describe('useMobileViewportLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    viewport = new VisualViewportStub()
    pageScrollX = 0
    pageScrollY = 0
    scrollToMock = vi.fn(() => {
      pageScrollX = 0
      pageScrollY = 0
      viewport.offsetLeft = 0
      viewport.offsetTop = 0
    })

    Object.defineProperties(window, {
      visualViewport: { configurable: true, value: viewport },
      scrollX: { configurable: true, get: () => pageScrollX },
      scrollY: { configurable: true, get: () => pageScrollY },
      scrollTo: { configurable: true, value: scrollToMock },
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0),
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))

    act(() => root.render(<TestPage />))
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('聚焦后使用 Visual Viewport 高度并随键盘变化更新', () => {
    const page = getElement('page')
    dispatchFocusEvent(getElement('editor'), 'focusin')
    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('780px')

    viewport.height = 440
    viewport.dispatchEvent(new Event('resize'))

    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('440px')
  })

  it('完成高度重排后恢复外层偏移且保留消息滚动位置', () => {
    const messageScroll = getElement('message-scroll')
    messageScroll.scrollTop = 180
    pageScrollY = 120
    viewport.offsetTop = 120

    dispatchFocusEvent(getElement('editor'), 'focusin')
    act(() => vi.advanceTimersByTime(0))

    expect(scrollToMock).toHaveBeenCalledWith(0, 0)
    expect(messageScroll.scrollTop).toBe(180)
  })

  it('编辑器之间切换焦点时保留键盘布局', () => {
    const page = getElement('page')
    const editor = getElement('editor')
    const secondEditor = getElement('second-editor')
    dispatchFocusEvent(editor, 'focusin')
    dispatchFocusEvent(editor, 'focusout', secondEditor)

    act(() => vi.advanceTimersByTime(300))

    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('780px')
  })

  it('失焦动画结束后移除临时高度并恢复外层偏移', () => {
    const page = getElement('page')
    const editor = getElement('editor')
    dispatchFocusEvent(editor, 'focusin')
    dispatchFocusEvent(editor, 'focusout')
    pageScrollY = 60
    viewport.offsetTop = 60

    act(() => vi.advanceTimersByTime(299))
    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('780px')

    act(() => vi.advanceTimersByTime(1))
    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('')
    expect(scrollToMock).toHaveBeenCalledWith(0, 0)
  })

  it('visualViewport 不可用时仍可安全恢复文档滚动', () => {
    act(() => root.unmount())
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
    root = createRoot(host)
    act(() => root.render(<TestPage />))
    const page = getElement('page')
    const editor = getElement('editor')
    pageScrollY = 60

    dispatchFocusEvent(editor, 'focusin')
    dispatchFocusEvent(editor, 'focusout')
    act(() => vi.runAllTimers())

    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('')
    expect(scrollToMock).toHaveBeenCalledWith(0, 0)
  })

  it('卸载后清理临时高度、恢复任务和视口监听', () => {
    const page = getElement('page')
    const editor = getElement('editor')
    dispatchFocusEvent(editor, 'focusin')
    dispatchFocusEvent(editor, 'focusout')
    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('780px')

    act(() => root.unmount())
    pageScrollY = 90
    viewport.offsetTop = 90
    viewport.dispatchEvent(new Event('scroll'))
    act(() => vi.runAllTimers())

    expect(page.style.getPropertyValue('--chat-viewport-height')).toBe('')
    expect(scrollToMock).not.toHaveBeenCalled()
  })
})
