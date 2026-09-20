import { parseChatReferences } from '../model/chatReference'
import type { ChatReference, ChatRole } from '../model/types'

import { createHttpClient } from '@/shared/api'

/** GET /api/v1/threads/{thread_id}/messages 返回的历史消息读取模型。 */
export interface ThreadMessageRead {
  readonly id: string
  readonly thread_id: string
  readonly role: ChatRole
  readonly content: string
  readonly references: readonly ChatReference[]
  readonly created_at: string
}

const chatClient = createHttpClient()

// 严格校验历史消息字段，避免不完整记录进入聊天渲染和重试流程。
function parseThreadMessageList(value: unknown): readonly ThreadMessageRead[] | null {
  if (!Array.isArray(value)) return null
  const messages: ThreadMessageRead[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null
    const message = item as Record<string, unknown>
    const references =
      message.references === undefined ? [] : parseChatReferences(message.references)
    if (
      typeof message.id !== 'string' ||
      typeof message.thread_id !== 'string' ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      typeof message.created_at !== 'string' ||
      references === null
    ) {
      return null
    }
    messages.push({
      id: message.id,
      thread_id: message.thread_id,
      role: message.role,
      content: message.content,
      references,
      created_at: message.created_at,
    })
  }
  return messages
}

// 拉取指定线程的历史消息；数组顺序由服务端决定，前端不再重排。
export async function requestListThreadMessages(
  threadId: string,
): Promise<readonly ThreadMessageRead[]> {
  const path = `/api/v1/threads/${encodeURIComponent(threadId)}/messages`
  const response = await chatClient.get<unknown>(path)
  const messages = parseThreadMessageList(response.data)
  if (!messages) {
    throw new Error('历史消息响应格式不正确')
  }
  return messages
}
