import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { copyTextToClipboard } from '../MessageSelectionActions/clipboard'
import styles from './AssistantCopyButton.module.scss'

interface AssistantCopyButtonProps {
  readonly content: string
}

type CopyStatus = 'idle' | 'copied' | 'failed'

const COPY_STATUS_RESET_DELAY = 1600

// 复制完整 AI 回答，并通过图标、提示文本和无障碍状态同步反馈结果。
export function AssistantCopyButton({ content }: AssistantCopyButtonProps) {
  const resetTimerRef = useRef<number>(undefined)
  const requestIdRef = useRef(0)
  const [status, setStatus] = useState<CopyStatus>('idle')

  useEffect(
    () => () => {
      requestIdRef.current += 1
      window.clearTimeout(resetTimerRef.current)
    },
    [],
  )

  const handleCopy = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    window.clearTimeout(resetTimerRef.current)

    const copied = await copyTextToClipboard(content)
    if (requestId !== requestIdRef.current) return

    setStatus(copied ? 'copied' : 'failed')
    resetTimerRef.current = window.setTimeout(() => setStatus('idle'), COPY_STATUS_RESET_DELAY)
  }, [content])

  const label =
    status === 'copied' ? '已复制回答' : status === 'failed' ? '复制失败，请重试' : '复制回答'

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.button} ${styles[status]}`}
        aria-label={label}
        title={label}
        onClick={() => void handleCopy()}
      >
        {status === 'copied' ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
      </button>
      <span className={styles.status} aria-live="polite">
        {status === 'idle' ? '' : label}
      </span>
    </div>
  )
}
