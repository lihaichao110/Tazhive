import { requestTokenRefresh } from '../api/refreshSession'
import { readStoredRefreshToken } from './accessTokenStorage'
import type { TokenPair } from './types'

// 消费持久化刷新令牌请求新令牌对；无凭据、请求失败或响应异常时返回 null。
// 只负责获取不落盘：调用方必须先判定会话未被更换，再持久化并应用新令牌。
export async function requestRefreshedTokenPair(): Promise<TokenPair | null> {
  const storedRefreshToken = readStoredRefreshToken()
  if (!storedRefreshToken) return null

  try {
    return await requestTokenRefresh(storedRefreshToken)
  } catch {
    // 刷新失败统一按“不可恢复”处理，由恢复链路上报拒绝并清理会话。
    return null
  }
}
