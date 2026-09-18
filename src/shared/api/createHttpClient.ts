import axios, { type AxiosError, type AxiosInstance } from 'axios'

import { getAccessToken, reportAccessTokenRejected } from './accessToken'
import { HttpError } from './httpError'
import { reportHttpError } from './httpErrorReporter'
import { recoverFromAccessTokenRejection } from './recoverRejectedToken'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    /** 标记该请求已用刷新后令牌重试过；随 mergeConfig 传递到重试请求，用于阻断重试死循环。 */
    tazhiveRefreshRetried?: boolean
  }
}

export interface HttpClientOptions {
  readonly baseURL?: string
  readonly timeout?: number
  readonly reportErrors?: boolean
  /** 设为 false 时不注入 Bearer 令牌、401 也不触发静默刷新；供刷新接口自身使用以避免递归。 */
  readonly authentication?: boolean
}

const DEVELOPMENT_API_PREFIX = ''

// 开发环境统一通过 Vite 代理访问后端，其他环境继续使用业务侧提供的服务地址。
function resolveBaseURL(configuredBaseURL?: string): string | undefined {
  return import.meta.env.MODE === 'development' ? DEVELOPMENT_API_PREFIX : configuredBaseURL
}

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalizedValue = value.trim()
  return normalizedValue || undefined
}

// FastAPI 的请求校验错误会把多条提示放在 detail 数组中；仅提取适合展示的 msg。
function readFastApiDetail(detail: unknown): string | undefined {
  const detailMessage = readNonEmptyString(detail)
  if (detailMessage) return detailMessage
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return readNonEmptyString(detail.message)
  }
  if (!Array.isArray(detail)) return undefined

  const validationMessages = detail.flatMap((item) => {
    if (typeof item !== 'object' || item === null || !('msg' in item)) return []
    const message = readNonEmptyString(item.msg)
    return message ? [message] : []
  })

  return validationMessages.length > 0 ? validationMessages.join('；') : undefined
}

// 兼容既有 message 契约和 FastAPI detail，避免把未知对象直接转换成展示文本。
function readServerMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  if ('message' in data) {
    const message = readNonEmptyString(data.message)
    if (message) return message
  }
  return 'detail' in data ? readFastApiDetail(data.detail) : undefined
}

function normalizeAxiosError(error: AxiosError): HttpError {
  const status = error.response?.status
  const serverMessage = readServerMessage(error.response?.data)

  if (serverMessage) {
    return new HttpError(serverMessage, {
      status,
      code: error.code,
      cause: error,
      data: error.response?.data,
    })
  }
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
    data: error.response?.data,
  })
}

// 从失败请求中读取其实际使用的 Bearer token，用于安全关联 401 与当前会话。
function readRequestAccessToken(error: AxiosError): string | null {
  const authorization = error.config?.headers.get('Authorization')
  if (typeof authorization !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return match?.[1]?.trim() || null
}

// 创建带统一鉴权和错误归一化能力的客户端；业务模块仍负责自己的接口路径与数据结构。
export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  const authenticationEnabled = options.authentication !== false
  const client = axios.create({
    baseURL: resolveBaseURL(options.baseURL),
    timeout: options.timeout,
    responseType: 'json',
  })

  client.interceptors.request.use(
    (config) => {
      if (!authenticationEnabled) return config
      const accessToken = getAccessToken()
      if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
      return config
    },
    undefined,
    { synchronous: true },
  )

  client.interceptors.response.use(undefined, async (error: unknown) => {
    // 取消属于用户操作而非请求失败，由业务层转换为自己的取消语义。
    if (axios.isCancel(error) || !axios.isAxiosError(error)) return Promise.reject(error)

    const usedToken = authenticationEnabled ? readRequestAccessToken(error) : null
    const requestConfig = error.config
    if (
      usedToken &&
      requestConfig &&
      error.response?.status === 401 &&
      !requestConfig.tazhiveRefreshRetried
    ) {
      // 恢复入口内部完成刷新与拒绝上报；失败时这里只按既有错误链路终结。
      const recoveredToken = await recoverFromAccessTokenRejection(usedToken)
      if (recoveredToken) {
        // 标记必须写在 config 上：重试会经 mergeConfig 派生新对象，仅靠对象标识无法识别。
        requestConfig.tazhiveRefreshRetried = true
        requestConfig.headers.set('Authorization', `Bearer ${recoveredToken}`)
        return client.request(requestConfig)
      }
    } else if (error.response?.status === 401 && usedToken) {
      // 未进入恢复流程的 401（已重试过的请求等）保留原有拒绝上报兜底。
      reportAccessTokenRejected(usedToken)
    }

    const normalizedError = normalizeAxiosError(error)
    if (options.reportErrors !== false) reportHttpError(normalizedError)
    return Promise.reject(normalizedError)
  })

  return client
}
