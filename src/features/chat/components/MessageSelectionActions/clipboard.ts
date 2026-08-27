function copyWithExecCommand(text: string): boolean {
  const selection = window.getSelection()
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))
    : []
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  const textArea = document.createElement('textarea')

  textArea.value = text
  textArea.readOnly = true
  textArea.setAttribute('aria-hidden', 'true')
  Object.assign(textArea.style, {
    position: 'fixed',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.append(textArea)

  let copied = false
  try {
    textArea.select()
    textArea.setSelectionRange(0, text.length)
    copied = document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    textArea.remove()
    activeElement?.focus({ preventScroll: true })
    selection?.removeAllRanges()
    ranges.forEach((range) => selection?.addRange(range))
  }

  return copied
}

// 优先使用标准剪贴板 API，并为非安全上下文和受限 WebView 提供同步降级复制。
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 权限拒绝后继续尝试兼容方案，最终结果由降级复制决定。
  }

  return copyWithExecCommand(text)
}
