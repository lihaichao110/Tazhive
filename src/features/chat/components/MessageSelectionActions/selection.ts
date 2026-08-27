interface MessageSelection {
  readonly text: string
  readonly rect: DOMRect
}

function getParentElement(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement
}

// 只接收完整落在同一个普通文本块内的选区，排除思考、图表和消息操作区。
export function readMessageSelection(container: HTMLElement): MessageSelection | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null

  const range = selection.getRangeAt(0)
  const startRoot = getParentElement(range.startContainer)?.closest('[data-quotable-text]')
  const endRoot = getParentElement(range.endContainer)?.closest('[data-quotable-text]')
  if (!startRoot || startRoot !== endRoot || !container.contains(startRoot)) return null

  const text = selection.toString().trim()
  const rect = range.getBoundingClientRect()
  if (!text || (!rect.width && !rect.height)) return null

  return { text, rect }
}
