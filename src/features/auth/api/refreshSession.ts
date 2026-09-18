import { createHttpClient, HttpError } from '@/shared/api'

import type { TokenPair } from '../model/types'

const REFRESH_PATH = '/api/v1/auth/refresh'

// 刷新请求不得注入访问令牌，更不得在 401 时再次触发刷新，否则会形成递归；
// 失败提示也保持静默，由恢复链路决定会话去留。
const refreshClient = createHttpClient({ authentication: false, reportErrors: false })

// 用刷新令牌换取新令牌对；按轮换契约，响应必须同时携带新的 access 与 refresh 令牌。
export async function requestTokenRefresh(refreshToken: string): Promise<TokenPair> {
  const { data } = await refreshClient.post<TokenPair>(REFRESH_PATH, {
    refresh_token: refreshToken,
  })
  const accessToken = data.access_token?.trim()
  const nextRefreshToken = data.refresh_token?.trim()

  if (!accessToken || !nextRefreshToken) throw new HttpError('刷新响应缺少有效令牌')

  return { access_token: accessToken, refresh_token: nextRefreshToken }
}
