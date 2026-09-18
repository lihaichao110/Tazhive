import { getAccessToken, reportAccessTokenRejected, requestAccessTokenRefresh } from './accessToken'

let refreshInFlight: Promise<boolean> | null = null

// 单飞执行刷新：并发 401 共享同一次刷新请求，避免刷新风暴与刷新令牌轮换被并发消费。
function runRefreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = requestAccessTokenRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * 携带 usedToken 的请求被 401 拒绝后的统一恢复入口：
 * - usedToken 已不是当前令牌 → 其他请求已完成刷新或用户已重新登录，直接返回当前令牌供重试；
 * - 当前令牌确实被拒 → 单飞刷新，成功返回新令牌，失败上报拒绝并返回 null。
 * 返回 null 表示会话已被清理，调用方不得再重试，只能终止请求。
 */
export async function recoverFromAccessTokenRejection(usedToken: string): Promise<string | null> {
  const currentToken = getAccessToken()
  if (!currentToken || currentToken !== usedToken) return currentToken

  const refreshed = await runRefreshOnce()
  const latestToken = getAccessToken()
  if (refreshed && latestToken) return latestToken

  // 刷新失败但令牌已被更换（如用户恰好重新登录）时不得清除新会话。
  if (latestToken && latestToken !== usedToken) return latestToken

  reportAccessTokenRejected(usedToken)
  return null
}
