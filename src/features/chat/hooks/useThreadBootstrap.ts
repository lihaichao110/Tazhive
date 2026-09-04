import { useCallback, useContext, useRef, useState } from 'react'

import { requestCreateThread } from '../api/createThread'
import { deriveThreadTitle } from '../model/threadTitle'
import { ConversationStoreContext } from '../providers/ConversationStoreContext'

/**
 * 首条消息自动建线程的结果：
 * ensureThread 返回当前会话可用的线程 ID（已绑定则复用，未绑定则先创建），失败或忙时返回 null。
 */
export interface ThreadBootstrap {
  readonly error: string | null
  /** 首条消息建线程请求进行中，需要向用户呈现与“回复中”一致的加载反馈。 */
  readonly isPreparing: boolean
  readonly ensureThread: (firstMessage: string) => Promise<null | string>
  /** 读取当前绑定的线程 ID，以调用时刻的 Store 状态为准。 */
  readonly getThreadId: () => string
}

// 新会话中用户直接发送第一条消息时还没有服务端线程；
// 该 Hook 负责在发送前自动创建线程并绑定当前会话，并把新线程 ID 交给聊天请求使用。
export function useThreadBootstrap(): ThreadBootstrap {
  const store = useContext(ConversationStoreContext)
  const [error, setError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  // 建线程请求进行中时拒绝再次触发，避免连点发送创建出重复线程。
  const creatingRef = useRef(false)

  if (!store) throw new Error('useThreadBootstrap 必须在 ConversationStoreProvider 内使用。')

  const ensureThread = useCallback(
    async (firstMessage: string): Promise<null | string> => {
      // 以调用时刻的 Store 状态为准，避免闭包中的旧选中值导致重复建线程。
      const boundThreadId = store.getState().selectedConversationId
      if (boundThreadId) return boundThreadId
      if (creatingRef.current) return null

      creatingRef.current = true
      setIsPreparing(true)
      setError(null)
      const title = deriveThreadTitle(firstMessage)
      try {
        const threadId = await requestCreateThread(title)
        store.getState().adoptConversation(threadId, title)
        return threadId
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '会话创建失败，请稍后重试')
        return null
      } finally {
        creatingRef.current = false
        setIsPreparing(false)
      }
    },
    [store],
  )

  const getThreadId = useCallback(() => store.getState().selectedConversationId, [store])

  return { error, isPreparing, ensureThread, getThreadId }
}
