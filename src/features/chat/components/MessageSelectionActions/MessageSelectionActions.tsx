import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Copy, MessageSquareQuote } from 'lucide-react'

import { copyTextToClipboard } from './clipboard'
import { readMessageSelection } from './selection'
import { useToolbarInteractionLock } from './useToolbarInteractionLock'
import { useTouchActivation } from './useTouchActivation'
import styles from './MessageSelectionActions.module.scss'

import type { ChatQuote, ChatRole } from '../../model/types'

interface MessageSelectionActionsProps {
  readonly children: ReactNode
  readonly enabled: boolean
  readonly messageId: string
  readonly role: ChatRole
  readonly onQuoteSelect: (quote: ChatQuote) => void
}

interface ToolbarPosition {
  readonly left: number
  readonly top: number
  readonly placement: 'above' | 'below'
}

type CopyStatus = 'idle' | 'copied' | 'failed'

const TOOLBAR_HALF_WIDTH = 78
const VIEWPORT_MARGIN = 8
const TOOLBAR_ESTIMATED_HEIGHT = 48
const SELECTION_SETTLE_DELAY = 80

function prefersToolbarBelow(): boolean {
  return window.matchMedia?.('(hover: none), (pointer: coarse)').matches ?? false
}

// 根据可视视口约束气泡位置；触屏端优先置于选区下方，避开常见的系统选区菜单。
function getToolbarPosition(rect: DOMRect): ToolbarPosition {
  const viewport = window.visualViewport
  const viewportLeft = viewport?.offsetLeft ?? 0
  const viewportTop = viewport?.offsetTop ?? 0
  const viewportWidth = viewport?.width ?? window.innerWidth
  const left = Math.min(
    viewportLeft + viewportWidth - TOOLBAR_HALF_WIDTH - VIEWPORT_MARGIN,
    Math.max(viewportLeft + TOOLBAR_HALF_WIDTH + VIEWPORT_MARGIN, rect.left + rect.width / 2),
  )
  const hasSpaceAbove = rect.top - viewportTop >= TOOLBAR_ESTIMATED_HEIGHT + VIEWPORT_MARGIN
  const placement = prefersToolbarBelow() || !hasSpaceAbove ? 'below' : 'above'

  return {
    left,
    top: placement === 'above' ? rect.top - VIEWPORT_MARGIN : rect.bottom + VIEWPORT_MARGIN,
    placement,
  }
}

// 读取当前消息内的文本选区，并在选区附近提供复制和引用追问操作。
export function MessageSelectionActions({
  children,
  enabled,
  messageId,
  role,
  onQuoteSelect,
}: MessageSelectionActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const selectionTimerRef = useRef<number>(undefined)
  const copyTimerRef = useRef<number>(undefined)
  const {
    begin: beginInteraction,
    isActive: isToolbarInteractionActive,
    release: releaseToolbarInteraction,
    reset: resetToolbarInteraction,
  } = useToolbarInteractionLock()
  const [selectedText, setSelectedText] = useState('')
  const [position, setPosition] = useState<ToolbarPosition | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  const closeToolbar = useCallback(() => {
    resetToolbarInteraction()
    setSelectedText('')
    setPosition(null)
    setCopyStatus('idle')
  }, [resetToolbarInteraction])

  const updateSelection = useCallback(() => {
    if (isToolbarInteractionActive()) return

    if (!enabled || !containerRef.current) {
      closeToolbar()
      return
    }

    const messageSelection = readMessageSelection(containerRef.current)
    if (!messageSelection) {
      closeToolbar()
      return
    }

    setSelectedText(messageSelection.text)
    setPosition(getToolbarPosition(messageSelection.rect))
    setCopyStatus('idle')
  }, [closeToolbar, enabled, isToolbarInteractionActive])

  // 移动端选区和拖拽手柄会异步更新，统一防抖后只读取最终范围。
  const scheduleSelectionUpdate = useCallback(() => {
    if (isToolbarInteractionActive()) return

    window.clearTimeout(selectionTimerRef.current)
    selectionTimerRef.current = window.setTimeout(updateSelection, SELECTION_SETTLE_DELAY)
  }, [isToolbarInteractionActive, updateSelection])

  // 气泡交互期间保留已缓存文本，避免 Android 在 click 前折叠选区并卸载按钮。
  const beginToolbarInteraction = useCallback(() => {
    window.clearTimeout(selectionTimerRef.current)
    beginInteraction()
  }, [beginInteraction])

  const cancelToolbarInteraction = useCallback(() => {
    resetToolbarInteraction()
    scheduleSelectionUpdate()
  }, [resetToolbarInteraction, scheduleSelectionUpdate])

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.shiftKey || event.key === 'Shift') scheduleSelectionUpdate()
    },
    [scheduleSelectionUpdate],
  )

  useEffect(() => {
    if (!enabled) {
      window.clearTimeout(selectionTimerRef.current)
      closeToolbar()
      return
    }

    const handleSelectionChange = () => {
      const container = containerRef.current
      const selection = window.getSelection()
      const selectionTouchesContainer =
        container &&
        selection &&
        ((selection.anchorNode && container.contains(selection.anchorNode)) ||
          (selection.focusNode && container.contains(selection.focusNode)))

      // 避免一条消息的选区变化让聊天记录中的所有消息同时启动定时器。
      if (position || selectionTouchesContainer) scheduleSelectionUpdate()
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [closeToolbar, enabled, position, scheduleSelectionUpdate])

  useEffect(() => {
    if (!position) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && toolbarRef.current?.contains(target)) return
      closeToolbar()
    }
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeToolbar()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', closeToolbar)
    window.addEventListener('scroll', closeToolbar, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', closeToolbar)
      window.removeEventListener('scroll', closeToolbar, true)
    }
  }, [closeToolbar, position])

  useEffect(
    () => () => {
      window.clearTimeout(selectionTimerRef.current)
      window.clearTimeout(copyTimerRef.current)
    },
    [],
  )

  const handleCopy = useCallback(async () => {
    const copied = await copyTextToClipboard(selectedText)
    setCopyStatus(copied ? 'copied' : 'failed')

    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setCopyStatus('idle'), 1600)
  }, [selectedText])

  const handleQuote = useCallback(() => {
    window.getSelection()?.removeAllRanges()
    closeToolbar()
    onQuoteSelect({ messageId, role, text: selectedText })
  }, [closeToolbar, messageId, onQuoteSelect, role, selectedText])
  const copyActivation = useTouchActivation(handleCopy, releaseToolbarInteraction)
  const quoteActivation = useTouchActivation(handleQuote, releaseToolbarInteraction)

  const copyLabel =
    copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败' : '复制'

  return (
    <div
      ref={containerRef}
      className={styles.selectionArea}
      onPointerUp={scheduleSelectionUpdate}
      onTouchEnd={scheduleSelectionUpdate}
      onKeyUp={handleKeyUp}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
      {position ? (
        <div
          ref={toolbarRef}
          className={`${styles.toolbar} ${styles[position.placement]}`}
          style={{ left: position.left, top: position.top }}
          role="toolbar"
          aria-label="选中文字操作"
          aria-live="polite"
          onPointerDown={beginToolbarInteraction}
          onPointerUp={releaseToolbarInteraction}
          onPointerCancel={cancelToolbarInteraction}
        >
          <button type="button" className={styles.action} {...copyActivation}>
            <Copy size={16} aria-hidden="true" />
            {copyLabel}
          </button>
          <span className={styles.divider} aria-hidden="true" />
          <button type="button" className={styles.action} {...quoteActivation}>
            <MessageSquareQuote size={16} aria-hidden="true" />
            追问
          </button>
        </div>
      ) : null}
    </div>
  )
}
