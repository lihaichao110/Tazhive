import { createHttpClient, HttpError } from '@/shared/api'

const verificationClient = createHttpClient({ timeout: 10_000, reportErrors: false })

// 服务端确认会话有效性；失败由初始化界面呈现，避免重复全局提示。
export async function verifySession(signal: AbortSignal): Promise<void> {
  const response = await verificationClient.get('/api/v1/auth/verify', {
    signal,
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (response.status !== 204) throw new HttpError('登录状态校验响应异常，请稍后重试')
}
