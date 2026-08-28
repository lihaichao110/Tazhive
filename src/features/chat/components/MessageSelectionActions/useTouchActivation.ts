import { useCallback, useEffect, useRef, type PointerEvent } from 'react'

const SYNTHETIC_CLICK_WINDOW = 700

interface TouchActivationHandlers {
  readonly onClick: () => void
  readonly onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
}

// 触屏在 pointerup 立即激活，并忽略浏览器随后可能补发的一次 click。
export function useTouchActivation(
  activate: () => void | Promise<void>,
  releaseInteraction: () => void,
): TouchActivationHandlers {
  const ignoreClickRef = useRef(false)
  const ignoreClickTimerRef = useRef<number>(undefined)

  const clearIgnoredClick = useCallback(() => {
    window.clearTimeout(ignoreClickTimerRef.current)
    ignoreClickRef.current = false
  }, [])

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return

      event.preventDefault()
      event.stopPropagation()
      window.clearTimeout(ignoreClickTimerRef.current)
      ignoreClickRef.current = true
      ignoreClickTimerRef.current = window.setTimeout(clearIgnoredClick, SYNTHETIC_CLICK_WINDOW)
      releaseInteraction()
      void activate()
    },
    [activate, clearIgnoredClick, releaseInteraction],
  )

  const onClick = useCallback(() => {
    if (ignoreClickRef.current) {
      clearIgnoredClick()
      return
    }

    void activate()
  }, [activate, clearIgnoredClick])

  useEffect(() => clearIgnoredClick, [clearIgnoredClick])

  return { onClick, onPointerUp }
}
