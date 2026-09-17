// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStickyBottomScroll } from './useStickyBottomScroll'

interface HostProps {
  readonly messages: readonly unknown[]
  readonly isReplying?: boolean
  readonly isSlow?: boolean
}

// 可手动触发回调的 ResizeObserver 桩，用于模拟 XCard 迟到的高度变化。
class ResizeObserverStub {
  static readonly instances: ResizeObserverStub[] = []
  readonly observed: Element[] = []
  private readonly callback: ResizeObserverCallback
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ResizeObserverStub.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.push(target)
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true
  }

  trigger(): void {
    act(() => this.callback([], this as unknown as ResizeObserver))
  }
}

let host: HTMLDivElement
let root: Root
let scrollHeightValue: number
let latestReady: ((surfaceId: string, element: HTMLElement) => void) | null = null

function TestScrollHost({ messages, isReplying = false, isSlow = false }: HostProps) {
  const { scrollAreaRef, messageListRef, handleDynamicCardReady } = useStickyBottomScroll({
    messages,
    isReplying,
    isSlow,
  })
  latestReady = handleDynamicCardReady

  return (
    <main ref={scrollAreaRef} data-testid="scroll-area">
      <div ref={messageListRef} data-testid="message-list" />
    </main>
  )
}

function getScrollArea(): HTMLElement {
  const element = host.querySelector<HTMLElement>('[data-testid="scroll-area"]')
  if (!element) throw new Error('找不到滚动容器')
  return element
}

function getMessageList(): HTMLElement {
  const element = host.querySelector<HTMLElement>('[data-testid="message-list"]')
  if (!element) throw new Error('找不到消息列表')
  return element
}

function currentObserver(): ResizeObserverStub {
  const observer = ResizeObserverStub.instances.at(-1)
  if (!observer) throw new Error('未创建 ResizeObserver')
  return observer
}

// 先渲染一次拿到 DOM，再注入可控的 scrollHeight，最后用新消息引用触发真实滚动路径。
function mountHost(props: HostProps): void {
  act(() => root.render(<TestScrollHost {...props} />))
  Object.defineProperty(getScrollArea(), 'scrollHeight', {
    configurable: true,
    get: () => scrollHeightValue,
  })
  act(() => root.render(<TestScrollHost {...props} messages={[...props.messages, {}]} />))
}

describe('useStickyBottomScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    ResizeObserverStub.instances.length = 0
    scrollHeightValue = 1000
    latestReady = null
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('消息引用变化后立即滚到底部并观察消息列表高度', () => {
    mountHost({ messages: [] })
    const scrollArea = getScrollArea()

    expect(scrollArea.scrollTop).toBe(1000)
    expect(currentObserver().observed).toContain(getMessageList())
  })

  it('沉降窗口内高度变化会持续贴底并重置空闲计时', () => {
    mountHost({ messages: [] })
    const scrollArea = getScrollArea()
    const observer = currentObserver()

    scrollArea.scrollTop = 300
    scrollHeightValue = 1500
    observer.trigger()
    expect(scrollArea.scrollTop).toBe(1500)

    act(() => vi.advanceTimersByTime(299))
    expect(observer.disconnected).toBe(false)

    scrollHeightValue = 1800
    observer.trigger()
    act(() => vi.advanceTimersByTime(299))
    expect(observer.disconnected).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(observer.disconnected).toBe(true)
  })

  it('空闲结束后停止监听，之后的迟到高度变化不再补滚', () => {
    mountHost({ messages: [] })
    const scrollArea = getScrollArea()
    const observer = currentObserver()
    const observerCount = ResizeObserverStub.instances.length

    act(() => vi.advanceTimersByTime(300))
    expect(observer.disconnected).toBe(true)

    scrollArea.scrollTop = 0
    scrollHeightValue = 2000
    act(() => vi.advanceTimersByTime(1000))
    expect(scrollArea.scrollTop).toBe(0)
    expect(ResizeObserverStub.instances).toHaveLength(observerCount)
  })

  it('回复状态变化同样触发贴底并重开沉降窗口', () => {
    mountHost({ messages: [] })
    const scrollArea = getScrollArea()
    act(() => vi.advanceTimersByTime(300))

    scrollArea.scrollTop = 0
    act(() => root.render(<TestScrollHost messages={[{}]} isReplying />))
    expect(scrollArea.scrollTop).toBe(1000)
    expect(currentObserver().disconnected).toBe(false)
  })

  it('动态卡片就绪通知按 surfaceId 去重并进入沉降窗口', () => {
    mountHost({ messages: [] })
    act(() => vi.advanceTimersByTime(300))
    const scrollArea = getScrollArea()
    const element = getMessageList()

    scrollArea.scrollTop = 0
    act(() => latestReady?.('surface-1', element))
    expect(scrollArea.scrollTop).toBe(1000)
    expect(currentObserver().disconnected).toBe(false)

    act(() => vi.advanceTimersByTime(300))
    scrollArea.scrollTop = 0
    const observerCount = ResizeObserverStub.instances.length
    act(() => latestReady?.('surface-1', element))
    expect(scrollArea.scrollTop).toBe(0)
    expect(ResizeObserverStub.instances).toHaveLength(observerCount)

    act(() => latestReady?.('surface-2', element))
    expect(scrollArea.scrollTop).toBe(1000)
  })

  it('卸载后断开沉降窗口的监听', () => {
    mountHost({ messages: [] })
    const observer = currentObserver()

    act(() => root.unmount())

    expect(observer.disconnected).toBe(true)
  })
})
