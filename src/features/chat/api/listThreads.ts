import { createHttpClient } from '@/shared/api'

/** GET /api/v1/threads 返回的会话读取模型。 */
export interface ThreadRead {
  /** 创建时间。 */
  readonly created_at: string
  /** 会话唯一标识。 */
  readonly id: string
  /** 会话状态。 */
  readonly status: string
  /** 会话标题，未生成标题时为 null。 */
  readonly title: null | string
  /** 最近更新时间。 */
  readonly updated_at: string
  /** 归属用户 ID。 */
  readonly user_id: string
}

const THREADS_PATH = '/api/v1/threads'

const chatClient = createHttpClient()

// 判断未知响应是否为合法的会话列表，仅校验承载渲染的关键字段。
function isThreadReadList(value: unknown): value is ThreadRead[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string',
    )
  )
}

// 拉取当前用户的服务端会话列表；网络与鉴权错误由 HTTP 客户端拦截器归一化为 HttpError。
export async function requestListThreads(): Promise<readonly ThreadRead[]> {
  const response = await chatClient.get<unknown>(THREADS_PATH)
  if (!isThreadReadList(response.data)) {
    throw new Error('会话列表响应格式不正确')
  }
  return response.data
}
