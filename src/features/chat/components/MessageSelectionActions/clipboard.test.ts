import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTextToClipboard } from './clipboard'

class FakeHTMLElement {
  readonly focus = vi.fn()
}

class FakeTextArea extends FakeHTMLElement {
  value = ''
  readOnly = false
  readonly style = {}
  readonly setAttribute = vi.fn()
  readonly select = vi.fn()
  readonly setSelectionRange = vi.fn()
  readonly remove = vi.fn()
}

function installFallbackEnvironment(execResult = true) {
  const range = {} as Range
  const selection = {
    rangeCount: 1,
    getRangeAt: vi.fn(() => range),
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  }
  const activeElement = new FakeHTMLElement()
  const textArea = new FakeTextArea()
  const execCommand = vi.fn(() => execResult)
  const append = vi.fn()

  vi.stubGlobal('HTMLElement', FakeHTMLElement)
  vi.stubGlobal('window', { getSelection: vi.fn(() => selection) })
  vi.stubGlobal('document', {
    activeElement,
    body: { append },
    createElement: vi.fn(() => textArea),
    execCommand,
  })

  return { activeElement, append, execCommand, range, selection, textArea }
}

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('优先使用 Clipboard API 复制', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(copyTextToClipboard('引用内容')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('引用内容')
  })

  it('Clipboard API 缺失时使用 execCommand 降级', async () => {
    vi.stubGlobal('navigator', {})
    const environment = installFallbackEnvironment()

    await expect(copyTextToClipboard('引用内容')).resolves.toBe(true)
    expect(environment.execCommand).toHaveBeenCalledWith('copy')
    expect(environment.textArea.value).toBe('引用内容')
  })

  it('Clipboard API 被拒绝后继续尝试降级复制', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const environment = installFallbackEnvironment()

    await expect(copyTextToClipboard('引用内容')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledOnce()
    expect(environment.execCommand).toHaveBeenCalledWith('copy')
  })

  it('两种复制方式都失败时返回 false', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    installFallbackEnvironment(false)

    await expect(copyTextToClipboard('引用内容')).resolves.toBe(false)
  })

  it('降级复制结束后恢复原焦点和文字选区', async () => {
    vi.stubGlobal('navigator', {})
    const environment = installFallbackEnvironment()

    await copyTextToClipboard('引用内容')

    expect(environment.append).toHaveBeenCalledOnce()
    expect(environment.textArea.remove).toHaveBeenCalledOnce()
    expect(environment.activeElement.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(environment.selection.removeAllRanges).toHaveBeenCalledOnce()
    expect(environment.selection.addRange).toHaveBeenCalledWith(environment.range)
  })
})
