/** @vitest-environment happy-dom */

import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useKnowledgeUpload, type KnowledgeUploadController } from './useKnowledgeUpload'

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }))

vi.mock('../api/uploadKnowledgeFile', () => ({ uploadKnowledgeFile: uploadMock }))

let root: ReturnType<typeof createRoot> | undefined
let controller: KnowledgeUploadController | undefined

function Harness() {
  const value = useKnowledgeUpload()
  useEffect(() => {
    controller = value
  }, [value])
  return null
}

function createDeferredRequest() {
  let resolve: () => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, abort: () => reject(new DOMException('取消', 'AbortError')) }
}

describe('useKnowledgeUpload', () => {
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    controller = undefined
    uploadMock.mockReset()
    const container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root?.render(<Harness />))
  })

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    controller = undefined
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('最多同时启动三个上传，完成后自动补充下一个', async () => {
    const requests = Array.from({ length: 4 }, createDeferredRequest)
    requests.forEach((request) => uploadMock.mockReturnValueOnce(request))
    const files = Array.from({ length: 4 }, (_, index) => new File(['x'], `${index}.txt`))

    await act(async () => controller?.addFiles(files))
    await act(async () => controller?.startUpload())

    expect(uploadMock).toHaveBeenCalledTimes(3)
    await act(async () => requests[0]?.resolve())
    expect(uploadMock).toHaveBeenCalledTimes(4)

    await act(async () => requests.slice(1).forEach((request) => request.resolve()))
    expect(controller?.items.every((item) => item.status === 'success')).toBe(true)
  })

  it('失败文件可以重试，取消会终止对应请求', async () => {
    const failed = createDeferredRequest()
    const retry = createDeferredRequest()
    uploadMock.mockReturnValueOnce(failed).mockReturnValueOnce(retry)

    await act(async () => controller?.addFiles([new File(['x'], 'retry.pdf')]))
    await act(async () => controller?.startUpload())
    await act(async () => failed.abort())
    expect(controller?.items[0]?.status).toBe('canceled')

    await act(async () => controller?.retryItem(controller.items[0]?.id ?? ''))
    expect(uploadMock).toHaveBeenCalledTimes(2)
    await act(async () => retry.resolve())
    expect(controller?.items[0]?.status).toBe('success')
  })
})
