import axios, { type AxiosError, type AxiosInstance } from 'axios'

import { getAccessToken } from './accessToken'
import { HttpError } from './httpError'

export interface HttpClientOptions {
  readonly baseURL?: string
  readonly timeout?: number
}

function readServerMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('message' in data)) return undefined
  return typeof data.message === 'string' && data.message.trim() ? data.message : undefined
}

function normalizeAxiosError(error: AxiosError): HttpError {
  const status = error.response?.status
  const serverMessage = readServerMessage(error.response?.data)

  if (serverMessage) return new HttpError(serverMessage, { status, code: error.code, cause: error })
  if (status === 401) {
    return new HttpError('登录状态已失效，请重新登录', { status, code: error.code, cause: error })
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new HttpError('请求超时，请稍后重试', { status, code: error.code, cause: error })
  }
  if (!error.response) {
    return new HttpError('网络连接异常，请检查后重试', { code: error.code, cause: error })
  }
  return new HttpError(`请求失败（HTTP ${status ?? '未知'}）`, {
    status,
    code: error.code,
    cause: error,
  })
}

// 创建带统一鉴权和错误归一化能力的客户端；业务模块仍负责自己的接口路径与数据结构。
export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout,
    responseType: 'json',
  })

  client.interceptors.request.use(
    (config) => {
      const accessToken = getAccessToken()
      if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
      return config
    },
    undefined,
    { synchronous: true },
  )

  client.interceptors.response.use(undefined, (error: unknown) => {
    // 取消属于用户操作而非请求失败，由业务层转换为自己的取消语义。
    if (axios.isCancel(error) || !axios.isAxiosError(error)) return Promise.reject(error)
    return Promise.reject(normalizeAxiosError(error))
  })

  return client
}
