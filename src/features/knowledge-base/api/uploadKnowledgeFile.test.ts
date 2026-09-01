/** @vitest-environment happy-dom */

import axios, { type AxiosProgressEvent, type AxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { createHttpClient, post } = vi.hoisted(() => {
  const mockedPost = vi.fn()
  return {
    createHttpClient: vi.fn(() => ({ post: mockedPost })),
    post: mockedPost,
  }
})

vi.mock('@/shared/api', () => ({
  createHttpClient,
}))

import { uploadKnowledgeFile } from './uploadKnowledgeFile'

interface DeferredRequest {
  readonly promise: Promise<void>
  readonly resolve: () => void
  readonly reject: (error: unknown) => void
}

function createDeferredRequest(): DeferredRequest {
  let resolvePromise: (() => void) | undefined
  let rejectPromise: ((error: unknown) => void) | undefined
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return {
    promise,
    resolve: () => resolvePromise?.(),
    reject: (error) => rejectPromise?.(error),
  }
}

function getRequestConfig(): AxiosRequestConfig {
  const config: unknown = post.mock.calls[0]?.[2]
  if (typeof config !== 'object' || config === null) throw new Error('未捕获上传配置')
  return config as AxiosRequestConfig
}

describe('uploadKnowledgeFile', () => {
  afterEach(() => post.mockReset())

  it('使用知识库地址和 120 秒超时创建客户端', () => {
    expect(createHttpClient).toHaveBeenCalledWith({ baseURL: '', timeout: 120_000 })
  })

  it('以 files 字段提交文件并通过 XHR 适配器报告进度', async () => {
    const deferred = createDeferredRequest()
    post.mockReturnValueOnce(deferred.promise)
    const file = new File(['hello'], 'guide.pdf')
    const onProgress = vi.fn()
    const request = uploadKnowledgeFile({ file, onProgress })
    const config = getRequestConfig()
    const formData: unknown = post.mock.calls[0]?.[1]

    expect(post).toHaveBeenCalledWith(
      '/knowledge-base/files',
      expect.any(FormData),
      expect.any(Object),
    )
    expect(formData).toBeInstanceOf(FormData)
    if (!(formData instanceof FormData)) throw new Error('上传内容不是 FormData')
    expect(formData.get('files')).toBe(file)
    expect(config.adapter).toBe('xhr')
    expect(config.headers).toBeUndefined()

    config.onUploadProgress?.({ loaded: 5, total: 10 } as AxiosProgressEvent)
    expect(onProgress).toHaveBeenCalledWith(50)
    config.onUploadProgress?.({ loaded: 10, total: 10 } as AxiosProgressEvent)
    expect(onProgress).toHaveBeenLastCalledWith(99)
    config.onUploadProgress?.({ loaded: 5 } as AxiosProgressEvent)
    expect(onProgress).toHaveBeenCalledTimes(2)

    deferred.resolve()
    await expect(request.promise).resolves.toBeUndefined()
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('保留公共错误并向队列继续抛出', async () => {
    const error = new Error('文档内容无法解析')
    post.mockRejectedValueOnce(error)
    const request = uploadKnowledgeFile({ file: new File(['x'], 'x.txt'), onProgress: vi.fn() })

    await expect(request.promise).rejects.toBe(error)
  })

  it('取消请求时终止 signal 并返回 AbortError', async () => {
    post.mockImplementationOnce((_url, _data, config: AxiosRequestConfig) => {
      return new Promise<void>((_resolve, reject) => {
        config.signal?.addEventListener?.('abort', () => reject(new axios.CanceledError()))
      })
    })
    const request = uploadKnowledgeFile({ file: new File(['x'], 'x.txt'), onProgress: vi.fn() })

    request.abort()

    expect(getRequestConfig().signal?.aborted).toBe(true)
    await expect(request.promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
