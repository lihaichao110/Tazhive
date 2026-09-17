import { useCallback, useEffect, useRef, type RefObject } from 'react'

import type { DynamicCardReadyHandler } from '@/features/chat'

/** 沉降窗口空闲时长：内容高度连续该时长无变化即认为渲染完成，停止贴底监听。 */
const SETTLE_IDLE_MS = 300

interface UseStickyBottomScrollInput {
  /** 消息列表引用；每次替换（流式 chunk、历史替换）都作为内容更新信号。 */
  readonly messages: readonly unknown[]
  readonly isReplying: boolean
  readonly isSlow: boolean
}

interface UseStickyBottomScrollResult {
  readonly scrollAreaRef: RefObject<HTMLElement | null>
  readonly messageListRef: RefObject<HTMLDivElement | null>
  readonly handleDynamicCardReady: DynamicCardReadyHandler
}

// 聊天区自动贴底 hook：消息更新与动态卡片挂载时立即滚到底部，并在短暂"沉降窗口"内
// 监听内容高度变化持续贴底。XCard 等动态内容挂载后仍需多次提交（rootNode 延迟一拍、
// catalog 走微任务）才真正撑开高度，一次性滚动会读到偏小的 scrollHeight，因此必须
// 观察高度直到稳定；窗口结束后的迟到高度变化（如表单校验错误展开）不再抢夺滚动位置。
export function useStickyBottomScroll({
  messages,
  isReplying,
  isSlow,
}: UseStickyBottomScrollInput): UseStickyBottomScrollResult {
  const scrollAreaRef = useRef<HTMLElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const handledSurfaceIdsRef = useRef(new Set<string>())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const settleTimerRef = useRef<number | null>(null)

  const scrollToBottom = useCallback((): void => {
    const scrollArea = scrollAreaRef.current
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight
  }, [])

  const stopSettle = useCallback((): void => {
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = null
  }, [])

  // 立即滚底并开启沉降窗口；每次高度变化都会重置空闲计时，连续空闲后自动结束窗口。
  const beginSettle = useCallback((): void => {
    const messageList = messageListRef.current
    stopSettle()
    scrollToBottom()
    if (!messageList || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      scrollToBottom()
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = window.setTimeout(stopSettle, SETTLE_IDLE_MS)
    })
    resizeObserverRef.current = observer
    observer.observe(messageList)
    settleTimerRef.current = window.setTimeout(stopSettle, SETTLE_IDLE_MS)
  }, [scrollToBottom, stopSettle])

  // 消息内容更新后统一滚到底部，文本与动态表单同时出现时保持连续阅读位置。
  useEffect(() => {
    scrollToBottom()
    beginSettle()
  }, [messages, isReplying, isSlow, scrollToBottom, beginSettle])

  // 卡片挂载后按当前页面策略滚到底部并进入沉降窗口，同一 Surface 只处理一次。
  const handleDynamicCardReady = useCallback<DynamicCardReadyHandler>(
    (surfaceId) => {
      if (handledSurfaceIdsRef.current.has(surfaceId)) return
      handledSurfaceIdsRef.current.add(surfaceId)
      beginSettle()
    },
    [beginSettle],
  )

  // 卸载或会话重挂载时释放监听与计时器，避免观察已分离的 DOM。
  useEffect(() => stopSettle, [stopSettle])

  return { scrollAreaRef, messageListRef, handleDynamicCardReady }
}
