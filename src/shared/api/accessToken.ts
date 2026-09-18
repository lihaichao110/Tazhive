export type AccessTokenProvider = () => string | null | undefined
export type AccessTokenRejectedHandler = (accessToken: string) => void
/** 静默刷新访问令牌；返回 true 表示已换取并应用新令牌。 */
export type AccessTokenRefresher = () => Promise<boolean>

const EMPTY_TOKEN_PROVIDER: AccessTokenProvider = () => null
const EMPTY_TOKEN_REJECTED_HANDLER: AccessTokenRejectedHandler = () => undefined
const EMPTY_TOKEN_REFRESHER: AccessTokenRefresher = async () => false

let accessTokenProvider: AccessTokenProvider = EMPTY_TOKEN_PROVIDER
let accessTokenRejectedHandler: AccessTokenRejectedHandler = EMPTY_TOKEN_REJECTED_HANDLER
let accessTokenRefresher: AccessTokenRefresher = EMPTY_TOKEN_REFRESHER

// 注册访问令牌读取器；登录模块卸载时应调用返回函数，避免保留过期状态引用。
export function registerAccessTokenProvider(provider: AccessTokenProvider): () => void {
  accessTokenProvider = provider

  return () => {
    if (accessTokenProvider === provider) accessTokenProvider = EMPTY_TOKEN_PROVIDER
  }
}

// 在每次请求发出前读取最新令牌，确保登录、续签和退出立即生效。
export function getAccessToken(): string | null {
  return accessTokenProvider()?.trim() || null
}

// 注册服务端拒绝访问令牌时的处理器；认证模块据此决定是否清理当前会话。
export function registerAccessTokenRejectedHandler(
  handler: AccessTokenRejectedHandler,
): () => void {
  accessTokenRejectedHandler = handler

  return () => {
    if (accessTokenRejectedHandler === handler) {
      accessTokenRejectedHandler = EMPTY_TOKEN_REJECTED_HANDLER
    }
  }
}

// 上报实际被拒绝的令牌，调用方必须传递对应请求使用的值以隔离延迟响应竞态。
export function reportAccessTokenRejected(accessToken: string | null | undefined): void {
  const normalizedAccessToken = accessToken?.trim()
  if (normalizedAccessToken) accessTokenRejectedHandler(normalizedAccessToken)
}

// 注册静默刷新器；刷新属于认证业务，请求层只能经此桥接触发，不得反向依赖认证模块。
export function registerAccessTokenRefresher(refresher: AccessTokenRefresher): () => void {
  accessTokenRefresher = refresher

  return () => {
    if (accessTokenRefresher === refresher) accessTokenRefresher = EMPTY_TOKEN_REFRESHER
  }
}

// 请求刷新访问令牌；认证模块未注册刷新器时视为不可恢复，调用方据此清理会话。
export async function requestAccessTokenRefresh(): Promise<boolean> {
  return accessTokenRefresher()
}
