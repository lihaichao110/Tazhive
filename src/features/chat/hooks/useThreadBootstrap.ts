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
  /** 重新登录后清除旧会话的建会话失败提示。 */
  readonly clearError: () => void
  /** 首条消息建线程请求进行中，需要向用户呈现与“回复中”一致的加载反馈。 */
  readonly isPreparing: boolean
  readonly ensureThread: (firstMessage: string) => Promise<null | string>
  /** 切换会话时使尚未完成的建线程结果失效，防止迟到响应重新绑定当前会话。 */
  readonly cancelPreparing: () => void
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
  const requestSeqRef = useRef(0)

  if (!store) throw new Error('useThreadBootstrap 必须在 ConversationStoreProvider 内使用。')

  const ensureThread = useCallback(
    async (firstMessage: string): Promise<null | string> => {
      // 以调用时刻的 Store 状态为准，避免闭包中的旧选中值导致重复建线程。
      const boundThreadId = store.getState().selectedConversationId
      if (boundThreadId) return boundThreadId
      if (creatingRef.current) return null

      creatingRef.current = true
      const requestSeq = requestSeqRef.current + 1
      requestSeqRef.current = requestSeq
      setIsPreparing(true)
      setError(null)
      const title = deriveThreadTitle(firstMessage)
      try {
        const threadId = await requestCreateThread(title)
        if (requestSeq !== requestSeqRef.current) return null
        store.getState().adoptConversation(threadId, title)
        return threadId
      } catch (cause: unknown) {
        if (requestSeq === requestSeqRef.current) {
          setError(cause instanceof Error ? cause.message : '会话创建失败，请稍后重试')
        }
        return null
      } finally {
        if (requestSeq === requestSeqRef.current) {
          creatingRef.current = false
          setIsPreparing(false)
        }
      }
    },
    [store],
  )

  const getThreadId = useCallback(() => store.getState().selectedConversationId, [store])

  const cancelPreparing = useCallback((): void => {
    requestSeqRef.current += 1
    creatingRef.current = false
    setIsPreparing(false)
    setError(null)
  }, [])

  // 认证恢复后，之前建会话请求的失败结果不能继续作为当前会话错误展示。
  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  return { error, clearError, isPreparing, ensureThread, cancelPreparing, getThreadId }
}
