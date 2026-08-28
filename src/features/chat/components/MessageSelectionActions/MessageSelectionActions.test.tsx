// @vitest-environment happy-dom

import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextToClipboard } from './clipboard'
import {
  pressAndroidButton,
  renderSelectionActions,
  settleSelection,
} from './messageSelectionTestUtils'

vi.mock('./clipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true),
}))

describe('MessageSelectionActions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('等待选区稳定后显示移动端气泡，并使用下方定位', () => {
    const environment = renderSelectionActions()

    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
      vi.advanceTimersByTime(79)
    })
    expect(environment.host.querySelector('[role="toolbar"]')).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    const toolbar = environment.host.querySelector<HTMLElement>('[role="toolbar"]')
    expect(toolbar).not.toBeNull()
    expect(toolbar?.style.top).toBe('128px')

    act(() => environment.root.unmount())
  })

  it('将连续选区变化防抖，并只采用最后一次状态', () => {
    const environment = renderSelectionActions()

    document.dispatchEvent(new Event('selectionchange'))
    environment.selectionState.isCollapsed = true
    document.dispatchEvent(new Event('selectionchange'))
    environment.selectionState.isCollapsed = false
    document.dispatchEvent(new Event('selectionchange'))
    act(() => vi.advanceTimersByTime(80))

    expect(environment.host.querySelector('[role="toolbar"]')).not.toBeNull()
    act(() => environment.root.unmount())
  })

  it('选区最终折叠后关闭气泡', () => {
    const environment = renderSelectionActions()
    settleSelection()
    environment.selectionState.isCollapsed = true

    settleSelection()

    expect(environment.host.querySelector('[role="toolbar"]')).toBeNull()
    act(() => environment.root.unmount())
  })

  it('Android 触摸复制不会取消 pointerdown，并且只执行一次', async () => {
    const environment = renderSelectionActions()
    settleSelection()
    const selectionArea = environment.host.firstElementChild
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    act(() => selectionArea?.dispatchEvent(contextMenuEvent))
    expect(contextMenuEvent.defaultPrevented).toBe(true)

    const copyButton = environment.host.querySelector<HTMLButtonElement>('button')
    if (!copyButton) throw new Error('复制按钮未渲染')
    const pointerDown = await pressAndroidButton(environment, copyButton)

    expect(pointerDown.defaultPrevented).toBe(false)
    expect(environment.host.querySelector('[role="toolbar"]')).not.toBeNull()
    expect(copyTextToClipboard).toHaveBeenCalledWith('移动端选区')
    expect(copyTextToClipboard).toHaveBeenCalledTimes(1)
    await act(async () => {
      copyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(copyTextToClipboard).toHaveBeenCalledTimes(1)

    act(() => environment.root.unmount())
  })

  it('鼠标和键盘产生的普通 click 仍能执行操作', async () => {
    const environment = renderSelectionActions()
    settleSelection()
    const copyButton = environment.host.querySelector<HTMLButtonElement>('button')
    if (!copyButton) throw new Error('复制按钮未渲染')

    await act(async () => copyButton.click())

    expect(copyTextToClipboard).toHaveBeenCalledWith('移动端选区')
    expect(copyTextToClipboard).toHaveBeenCalledTimes(1)
    act(() => environment.root.unmount())
  })

  it('Android 触摸追问在没有 click 时仍使用缓存文本', async () => {
    const environment = renderSelectionActions()
    settleSelection()
    const buttons = environment.host.querySelectorAll<HTMLButtonElement>('button')
    const quoteButton = buttons[1]
    if (!quoteButton) throw new Error('追问按钮未渲染')

    const pointerDown = await pressAndroidButton(environment, quoteButton)

    expect(pointerDown.defaultPrevented).toBe(false)
    expect(environment.onQuoteSelect).toHaveBeenCalledWith({
      messageId: 'assistant-1',
      role: 'assistant',
      text: '移动端选区',
    })
    expect(environment.host.querySelector('[role="toolbar"]')).toBeNull()
    act(() => environment.root.unmount())
  })

  it('pointercancel 释放交互锁并按最终选区关闭气泡', () => {
    const environment = renderSelectionActions()
    settleSelection()
    const button = environment.host.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('操作按钮未渲染')

    act(() => {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
      environment.selectionState.isCollapsed = true
      button.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, pointerType: 'touch' }),
      )
      vi.advanceTimersByTime(80)
    })

    expect(environment.host.querySelector('[role="toolbar"]')).toBeNull()
    act(() => environment.root.unmount())
  })

  it('外部点击关闭气泡并释放交互锁', () => {
    const environment = renderSelectionActions()
    settleSelection()
    const button = environment.host.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('操作按钮未渲染')

    act(() => {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })

    expect(environment.host.querySelector('[role="toolbar"]')).toBeNull()
    act(() => environment.root.unmount())
  })

  it('卸载时清理气泡交互释放定时器', () => {
    const environment = renderSelectionActions()
    settleSelection()
    const button = environment.host.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('操作按钮未渲染')

    act(() => {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
      button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }))
    })
    expect(vi.getTimerCount()).toBe(1)

    act(() => environment.root.unmount())

    expect(vi.getTimerCount()).toBe(0)
  })
})
