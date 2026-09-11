// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextToClipboard } from '../MessageSelectionActions/clipboard'
import { AssistantCopyButton } from './AssistantCopyButton'

vi.mock('../MessageSelectionActions/clipboard', () => ({
  copyTextToClipboard: vi.fn(),
}))

describe('AssistantCopyButton', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.mocked(copyTextToClipboard).mockReset()
  })

  it('复制成功后显示确认状态并自动恢复', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true)
    await act(async () => root.render(<AssistantCopyButton content="# 最终回答" />))

    const button = host.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('复制按钮未渲染')

    await act(async () => button.click())
    expect(copyTextToClipboard).toHaveBeenCalledWith('# 最终回答')
    expect(button.getAttribute('aria-label')).toBe('已复制回答')

    act(() => vi.advanceTimersByTime(1600))
    expect(button.getAttribute('aria-label')).toBe('复制回答')
  })

  it('连续操作只保留最后一次结果与重置计时器', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    await act(async () => root.render(<AssistantCopyButton content="回答" />))

    const button = host.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('复制按钮未渲染')

    await act(async () => button.click())
    act(() => vi.advanceTimersByTime(800))
    await act(async () => button.click())

    expect(button.getAttribute('aria-label')).toBe('复制失败，请重试')
    act(() => vi.advanceTimersByTime(799))
    expect(button.getAttribute('aria-label')).toBe('复制失败，请重试')
    act(() => vi.advanceTimersByTime(801))
    expect(button.getAttribute('aria-label')).toBe('复制回答')
  })
})
