import { createHttpClient } from '@/shared/api'

const THREADS_PATH = '/api/v1/threads'

const chatClient = createHttpClient()

// 向服务端创建会话并返回新线程 ID，供后续请求把消息关联到该会话。
export async function requestCreateThread(title: string): Promise<string> {
  const response = await chatClient.post<unknown>(THREADS_PATH, { title })
  if (
    typeof response.data !== 'object' ||
    response.data === null ||
    typeof (response.data as Record<string, unknown>).id !== 'string'
  ) {
    throw new Error('创建会话响应格式不正确')
  }
  return (response.data as Record<string, string>).id
}
