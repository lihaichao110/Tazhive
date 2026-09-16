export interface HttpErrorOptions {
  readonly status?: number
  readonly code?: string
  readonly cause?: unknown
  readonly data?: unknown
}

// 表示已经过传输层归一化的请求错误，业务层只需消费稳定的中文提示和状态码。
export class HttpError extends Error {
  readonly status?: number
  readonly code?: string
  readonly data?: unknown

  constructor(message: string, options: HttpErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'HttpError'
    this.status = options.status
    this.code = options.code
    this.data = options.data
  }
}
