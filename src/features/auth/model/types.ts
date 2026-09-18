// 成对签发的令牌：access 用于业务请求，refresh 仅用于静默换取新令牌对。
export interface TokenPair {
  readonly access_token: string
  readonly refresh_token: string
}

export interface LoginResponse extends TokenPair {
  readonly token_type: string
}

export interface LoginCredentials {
  readonly username: string
  readonly password: string
}

export type AuthStatus = 'authenticated' | 'unauthenticated'

export interface AuthController {
  readonly status: AuthStatus
  readonly isAuthenticated: boolean
  readonly isLoggingIn: boolean
  readonly error: string | null
  readonly login: (credentials: LoginCredentials) => Promise<void>
}
