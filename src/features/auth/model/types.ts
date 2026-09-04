export interface LoginResponse {
  readonly access_token: string
  readonly token_type: string
}

export interface LoginCredentials {
  readonly username: string
  readonly password: string
}

export interface AuthController {
  readonly isAuthenticated: boolean
  readonly isLoggingIn: boolean
  readonly error: string | null
  readonly login: (credentials: LoginCredentials) => Promise<void>
}
