import { HttpError } from '@/shared/api'

// 仅从约定的 JSON 字段读取后端文案，避免把代理返回的 HTML 错误页展示给用户。
export async function readChatHttpError(response: Response): Promise<HttpError> {
  let message: string | undefined
  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object') {
      const body = payload as { error?: unknown; message?: unknown; detail?: unknown }
      const error = body.error
      const nested =
        error && typeof error === 'object' ? (error as { message?: unknown }).message : error
      const candidate = [nested, body.message, body.detail].find(
        (value): value is string => typeof value === 'string' && value.trim() !== '',
      )
      message = candidate?.trim()
    }
  } catch {
    // 空响应或非 JSON 错误保留 HTTP 状态，仍然给出稳定的中文提示。
  }
  return new HttpError(message ?? `请求失败（HTTP ${response.status}），请重试。`, {
    status: response.status,
  })
}
