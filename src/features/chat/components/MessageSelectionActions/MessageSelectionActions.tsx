import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Copy, MessageSquareQuote } from 'lucide-react'

import { copyTextToClipboard } from './clipboard'
import { readMessageSelection } from './selection'
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

function getToolbarPosition(rect: DOMRect): ToolbarPosition {
  const left = Math.min(
    window.innerWidth - TOOLBAR_HALF_WIDTH - VIEWPORT_MARGIN,
    Math.max(TOOLBAR_HALF_WIDTH + VIEWPORT_MARGIN, rect.left + rect.width / 2),
  )
  const hasSpaceAbove = rect.top >= TOOLBAR_ESTIMATED_HEIGHT + VIEWPORT_MARGIN

  return {
    left,
    top: hasSpaceAbove ? rect.top - VIEWPORT_MARGIN : rect.bottom + VIEWPORT_MARGIN,
    placement: hasSpaceAbove ? 'above' : 'below',
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
  const [selectedText, setSelectedText] = useState('')
  const [position, setPosition] = useState<ToolbarPosition | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  const closeToolbar = useCallback(() => {
    setSelectedText('')
    setPosition(null)
    setCopyStatus('idle')
  }, [])

  const updateSelection = useCallback(() => {
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
  }, [closeToolbar, enabled])

  const handlePointerUp = useCallback(() => {
    window.clearTimeout(selectionTimerRef.current)
    // 移动端原生选区会在 pointerup 后才完成，延后一帧读取最终范围。
    selectionTimerRef.current = window.setTimeout(updateSelection, 0)
  }, [updateSelection])

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.shiftKey || event.key === 'Shift') updateSelection()
    },
    [updateSelection],
  )

  useEffect(() => {
    if (!position) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && toolbarRef.current?.contains(target)) return
      closeToolbar()
    }
    const handleSelectionChange = () => {
      if (window.getSelection()?.isCollapsed) closeToolbar()
    }
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeToolbar()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', closeToolbar)
    window.addEventListener('scroll', closeToolbar, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('selectionchange', handleSelectionChange)
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

  const copyLabel =
    copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败' : '复制'

  return (
    <div
      ref={containerRef}
      className={styles.selectionArea}
      onPointerUp={handlePointerUp}
      onKeyUp={handleKeyUp}
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
          onPointerDown={(event) => event.preventDefault()}
        >
          <button type="button" className={styles.action} onClick={handleCopy}>
            <Copy size={16} aria-hidden="true" />
            {copyLabel}
          </button>
          <span className={styles.divider} aria-hidden="true" />
          <button type="button" className={styles.action} onClick={handleQuote}>
            <MessageSquareQuote size={16} aria-hidden="true" />
            追问
          </button>
        </div>
      ) : null}
    </div>
  )
}
