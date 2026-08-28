interface DynamicCardScrollInput {
  readonly areaTop: number
  readonly cardTop: number
  readonly clientHeight: number
  readonly currentScrollTop: number
  readonly scrollHeight: number
  readonly topOffset: number
}

interface DynamicCardScrollResult {
  readonly reserveHeight: number
  readonly targetTop: number
}

// 计算卡片顶部定位值，并补足消息末尾无法继续滚动时所需的最小空间。
export function calculateDynamicCardScroll({
  areaTop,
  cardTop,
  clientHeight,
  currentScrollTop,
  scrollHeight,
  topOffset,
}: DynamicCardScrollInput): DynamicCardScrollResult {
  const targetTop = Math.max(0, currentScrollTop + cardTop - areaTop - topOffset)
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)

  return {
    targetTop,
    reserveHeight: Math.max(0, targetTop - maxScrollTop),
  }
}
