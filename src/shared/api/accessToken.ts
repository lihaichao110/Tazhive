export type AccessTokenProvider = () => string | null | undefined

const EMPTY_TOKEN_PROVIDER: AccessTokenProvider = () => null

let accessTokenProvider: AccessTokenProvider = EMPTY_TOKEN_PROVIDER

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
