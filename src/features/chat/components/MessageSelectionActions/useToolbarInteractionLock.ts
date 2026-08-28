import { useCallback, useEffect, useRef } from 'react'

const TOOLBAR_INTERACTION_RELEASE_DELAY = 400

interface ToolbarInteractionLock {
  readonly begin: () => void
  readonly isActive: () => boolean
  readonly release: () => void
  readonly reset: () => void
}

// 在 Android 延迟合成 click 的窗口内锁住气泡，避免选区折叠提前卸载按钮。
export function useToolbarInteractionLock(): ToolbarInteractionLock {
  const releaseTimerRef = useRef<number>(undefined)
  const isActiveRef = useRef(false)

  const reset = useCallback(() => {
    window.clearTimeout(releaseTimerRef.current)
    isActiveRef.current = false
  }, [])

  const begin = useCallback(() => {
    window.clearTimeout(releaseTimerRef.current)
    isActiveRef.current = true
  }, [])

  const release = useCallback(() => {
    window.clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = window.setTimeout(() => {
      isActiveRef.current = false
    }, TOOLBAR_INTERACTION_RELEASE_DELAY)
  }, [])

  const isActive = useCallback(() => isActiveRef.current, [])

  useEffect(() => reset, [reset])

  return { begin, isActive, release, reset }
}
