import { createHttpClient, HttpError } from '@/shared/api'

import type { LoginCredentials, LoginResponse } from '../model/types'

const LOGIN_PATH = '/api/v1/auth/login'

const authClient = createHttpClient()

// 使用用户提交的账号密码登录，并拒绝缺少访问令牌的异常成功响应。
export async function requestLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await authClient.post<LoginResponse>(LOGIN_PATH, credentials)
  const accessToken = data.access_token?.trim()

  if (!accessToken) throw new HttpError('登录响应缺少有效访问令牌')

  return { ...data, access_token: accessToken }
}
