// @vitest-environment happy-dom

import { act, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DynamicCardHostProvider } from './DynamicCardHostProvider'
import { useDynamicCardHost } from './useDynamicCardHost'

function DynamicCardReporter() {
  const elementRef = useRef<HTMLDivElement>(null)
  const onReady = useDynamicCardHost()

  useEffect(() => {
    if (elementRef.current) onReady('surface-1', elementRef.current)
  }, [onReady])

  return <div ref={elementRef}>动态卡片</div>
}

describe('DynamicCardHostProvider', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('将卡片就绪事件交给最近的宿主边界', () => {
    const outerReady = vi.fn()
    const innerReady = vi.fn()

    act(() => {
      root.render(
        <DynamicCardHostProvider onReady={outerReady}>
          <DynamicCardHostProvider onReady={innerReady}>
            <DynamicCardReporter />
          </DynamicCardHostProvider>
        </DynamicCardHostProvider>,
      )
    })

    expect(innerReady).toHaveBeenCalledTimes(1)
    expect(innerReady).toHaveBeenCalledWith('surface-1', expect.any(HTMLDivElement))
    expect(outerReady).not.toHaveBeenCalled()
  })
})
