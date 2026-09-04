import { createHttpClient } from '@/shared/api'

const THREADS_PATH = '/api/v1/threads'

const chatClient = createHttpClient()

// 向服务端创建会话；本地会话状态仅应在该请求成功后更新。
export async function requestCreateThread(title: string): Promise<void> {
  await chatClient.post(THREADS_PATH, { title })
}
