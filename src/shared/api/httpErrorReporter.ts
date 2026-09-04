import type { HttpError } from './httpError'

export type HttpErrorReporter = (error: HttpError) => void

const EMPTY_HTTP_ERROR_REPORTER: HttpErrorReporter = () => undefined

let httpErrorReporter: HttpErrorReporter = EMPTY_HTTP_ERROR_REPORTER

// 注册应用级 HTTP 错误展示器；卸载时只清理当前注册实例，避免覆盖后续 Provider。
export function registerHttpErrorReporter(reporter: HttpErrorReporter): () => void {
  httpErrorReporter = reporter

  return () => {
    if (httpErrorReporter === reporter) httpErrorReporter = EMPTY_HTTP_ERROR_REPORTER
  }
}

// 请求层只上报归一化错误，不依赖具体 UI 组件或提示库。
export function reportHttpError(error: HttpError): void {
  httpErrorReporter(error)
}
