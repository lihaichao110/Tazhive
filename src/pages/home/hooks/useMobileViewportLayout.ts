import { useEffect, type RefObject } from 'react'

const EDITABLE_SELECTOR =
  'input:not([disabled]), textarea:not([disabled]), [contenteditable]:not([contenteditable="false"])'
const VIEWPORT_HEIGHT_PROPERTY = '--chat-viewport-height'
const VIEWPORT_EPSILON = 1
const KEYBOARD_SETTLE_DELAY_MS = 300

function isEditableElement(target: EventTarget | null): target is Element {
  return target instanceof Element && target.matches(EDITABLE_SELECTOR)
}

function hasOuterViewportOffset(viewport: VisualViewport | null | undefined): boolean {
  return (
    Math.abs(window.scrollX) > VIEWPORT_EPSILON ||
    Math.abs(window.scrollY) > VIEWPORT_EPSILON ||
    Math.abs(viewport?.offsetLeft ?? 0) > VIEWPORT_EPSILON ||
    Math.abs(viewport?.offsetTop ?? 0) > VIEWPORT_EPSILON
  )
}

// 键盘打开时用 Visual Viewport 压缩聊天页，避免 iOS Safari 在长对话中把输入栏过度抬高。
// 消息区拥有独立滚动容器，因此这里只调整页面高度和 window 偏移，不改动消息区 scrollTop。
export function useMobileViewportLayout(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewport = window.visualViewport
    let hasEditableFocus = false
    let isManagingViewport = false
    let resetFrameId: number | null = null
    let settleTimerId: number | null = null

    const clearResetFrame = (): void => {
      if (resetFrameId !== null) cancelAnimationFrame(resetFrameId)
      resetFrameId = null
    }

    const clearSettleTimer = (): void => {
      if (settleTimerId !== null) window.clearTimeout(settleTimerId)
      settleTimerId = null
    }

    const resetOuterViewport = (): void => {
      if (hasOuterViewportOffset(viewport)) window.scrollTo(0, 0)
    }

    const scheduleOuterViewportReset = (): void => {
      clearResetFrame()
      // 必须先让新的可视高度完成 flex 重排，再撤销 Safari 为旧布局添加的自动平移。
      resetFrameId = requestAnimationFrame(() => {
        resetFrameId = null
        resetOuterViewport()
      })
    }

    const syncViewportLayout = (): void => {
      if (!isManagingViewport || !viewport) return
      container.style.setProperty(VIEWPORT_HEIGHT_PROPERTY, `${viewport.height}px`)
      scheduleOuterViewportReset()
    }

    const finishViewportManagement = (): void => {
      isManagingViewport = false
      container.style.removeProperty(VIEWPORT_HEIGHT_PROPERTY)
      resetOuterViewport()
      // 移除临时高度也可能触发一次布局位移，下一帧再做最终兜底。
      scheduleOuterViewportReset()
    }

    const handleFocusIn = (event: FocusEvent): void => {
      if (!isEditableElement(event.target)) return
      hasEditableFocus = true
      isManagingViewport = true
      clearSettleTimer()
      syncViewportLayout()
    }

    const handleFocusOut = (event: FocusEvent): void => {
      if (!hasEditableFocus || !isEditableElement(event.target)) return
      if (isEditableElement(event.relatedTarget)) return

      hasEditableFocus = false
      syncViewportLayout()
      scheduleOuterViewportReset()
      clearSettleTimer()
      // 键盘收起动画期间保留动态高度，结束后再回退到页面原有的 100dvh。
      settleTimerId = window.setTimeout(() => {
        settleTimerId = null
        if (isEditableElement(document.activeElement)) {
          hasEditableFocus = true
          syncViewportLayout()
          return
        }
        finishViewportManagement()
      }, KEYBOARD_SETTLE_DELAY_MS)
    }

    const handleViewportChange = (): void => {
      syncViewportLayout()
    }

    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('focusout', handleFocusOut)
    viewport?.addEventListener('resize', handleViewportChange)
    viewport?.addEventListener('scroll', handleViewportChange)

    return () => {
      clearResetFrame()
      clearSettleTimer()
      container.style.removeProperty(VIEWPORT_HEIGHT_PROPERTY)
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('focusout', handleFocusOut)
      viewport?.removeEventListener('resize', handleViewportChange)
      viewport?.removeEventListener('scroll', handleViewportChange)
    }
  }, [containerRef])
}
