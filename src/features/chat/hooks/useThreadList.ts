import { useEffect, useRef, useState } from 'react'

import { requestListThreads } from '../api/listThreads'
import { mapThreadsToConversations } from '../model/threadMapping'
import { useConversationStore } from '../providers/useConversationStore'

import { HttpError } from '@/shared/api'

export interface ThreadListStatus {
  /** 是否正在拉取会话列表。 */
  readonly isLoading: boolean
  /** 最近一次拉取失败时的提示文案，成功后清空。 */
  readonly errorMessage: string
  /** 最近一次拉取失败是否因登录失效（HTTP 401）导致，成功后复位。 */
  readonly isUnauthorized: boolean
}

const IDLE_STATUS: ThreadListStatus = { isLoading: false, errorMessage: '', isUnauthorized: false }

// 抽屉打开时拉取服务端会话列表并写入 Store；过期响应（关闭后返回或已重新发起）直接丢弃。
export function useThreadList(): ThreadListStatus {
  const isSidebarOpen = useConversationStore((state) => state.isSidebarOpen)
  const setConversations = useConversationStore((state) => state.setConversations)
  const [status, setStatus] = useState<ThreadListStatus>(IDLE_STATUS)
  // 递增的请求序号：仅最新一次请求允许写入状态，防止竞态覆盖。
  const requestSeqRef = useRef(0)

  useEffect(() => {
    if (!isSidebarOpen) return

    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    const isLatestRequest = () => requestSeqRef.current === requestSeq

    setStatus({ isLoading: true, errorMessage: '', isUnauthorized: false })

    void requestListThreads()
      .then((threads) => {
        if (!isLatestRequest()) return
        setConversations(mapThreadsToConversations(threads))
        setStatus(IDLE_STATUS)
      })
      .catch((error: unknown) => {
        if (!isLatestRequest()) return
        // 以状态码而非文案判定登录失效，服务端返回自定义 401 文案时依然可靠。
        const isUnauthorized = error instanceof HttpError && error.status === 401
        const message = error instanceof Error ? error.message : '会话列表加载失败，请稍后重试'
        setStatus({ isLoading: false, errorMessage: message, isUnauthorized })
      })
  }, [isSidebarOpen, setConversations])

  return status
}
