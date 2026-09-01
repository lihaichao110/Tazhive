import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { uploadKnowledgeFile } from '../api/uploadKnowledgeFile'
import { validateKnowledgeFiles } from '../model/fileValidation'
import type { FileRejection, KnowledgeUploadItem } from '../model/types'

const MAX_CONCURRENT_UPLOADS = 3

function createUploadId(): string {
  return crypto.randomUUID()
}

export interface KnowledgeUploadController {
  readonly items: readonly KnowledgeUploadItem[]
  readonly rejections: readonly FileRejection[]
  readonly isUploading: boolean
  readonly canStart: boolean
  readonly addFiles: (files: readonly File[]) => void
  readonly clearRejections: () => void
  readonly startUpload: () => void
  readonly retryItem: (id: string) => void
  readonly cancelItem: (id: string) => void
  readonly removeItem: (id: string) => void
  readonly clearCompleted: () => void
  readonly cancelAll: () => void
}

// 管理上传队列与并发调度；页面卸载时会主动终止所有仍在执行的请求。
export function useKnowledgeUpload(): KnowledgeUploadController {
  const [items, setItems] = useState<KnowledgeUploadItem[]>([])
  const [rejections, setRejections] = useState<FileRejection[]>([])
  const [isBatchActive, setIsBatchActive] = useState(false)
  const requestsRef = useRef(new Map<string, () => void>())
  const mountedRef = useRef(true)

  const updateItem = useCallback((id: string, patch: Partial<KnowledgeUploadItem>): void => {
    if (!mountedRef.current) return
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const runUpload = useCallback(
    (item: KnowledgeUploadItem): void => {
      const request = uploadKnowledgeFile({
        file: item.file,
        onProgress: (progress) => updateItem(item.id, { progress }),
      })
      requestsRef.current.set(item.id, request.abort)
      void request.promise
        .then(() => updateItem(item.id, { progress: 100, status: 'success', error: undefined }))
        .catch((error: unknown) => {
          const canceled = error instanceof DOMException && error.name === 'AbortError'
          updateItem(item.id, {
            status: canceled ? 'canceled' : 'error',
            error: canceled
              ? undefined
              : error instanceof Error
                ? error.message
                : '上传失败，请重试',
          })
        })
        .finally(() => requestsRef.current.delete(item.id))
    },
    [updateItem],
  )

  // 每次队列状态变化时填满三个并发槽位，直至没有待上传文件。
  useEffect(() => {
    if (!isBatchActive) return
    const uploadingCount = items.filter((item) => item.status === 'uploading').length
    const candidates = items
      .filter((item) => item.status === 'queued')
      .slice(0, Math.max(0, MAX_CONCURRENT_UPLOADS - uploadingCount))

    if (candidates.length === 0) {
      if (uploadingCount === 0) setIsBatchActive(false)
      return
    }

    const candidateIds = new Set(candidates.map((item) => item.id))
    setItems((current) =>
      current.map((item) =>
        candidateIds.has(item.id) ? { ...item, status: 'uploading', progress: 0 } : item,
      ),
    )
    candidates.forEach(runUpload)
  }, [isBatchActive, items, runUpload])

  useEffect(
    () => () => {
      mountedRef.current = false
      requestsRef.current.forEach((abort) => abort())
      requestsRef.current.clear()
    },
    [],
  )

  const addFiles = useCallback(
    (files: readonly File[]): void => {
      const result = validateKnowledgeFiles(items, files)
      setRejections(result.rejected)
      if (result.accepted.length === 0) return
      setItems((current) => [
        ...current,
        ...result.accepted.map((file) => ({
          id: createUploadId(),
          file,
          progress: 0,
          status: 'queued' as const,
        })),
      ])
    },
    [items],
  )

  const retryItem = useCallback(
    (id: string): void => {
      updateItem(id, { status: 'queued', progress: 0, error: undefined })
      setIsBatchActive(true)
    },
    [updateItem],
  )

  const cancelItem = useCallback(
    (id: string): void => {
      const abort = requestsRef.current.get(id)
      if (abort) {
        abort()
        return
      }
      updateItem(id, { status: 'canceled', progress: 0, error: undefined })
    },
    [updateItem],
  )

  const removeItem = useCallback((id: string): void => {
    setItems((current) => current.filter((item) => item.id !== id || item.status === 'uploading'))
  }, [])

  const clearCompleted = useCallback((): void => {
    setItems((current) =>
      current.filter((item) => item.status !== 'success' && item.status !== 'canceled'),
    )
  }, [])

  const cancelAll = useCallback((): void => {
    requestsRef.current.forEach((abort) => abort())
    setIsBatchActive(false)
  }, [])

  const isUploading = items.some((item) => item.status === 'uploading')
  const canStart = !isUploading && items.some((item) => item.status === 'queued')

  return useMemo(
    () => ({
      items,
      rejections,
      isUploading,
      canStart,
      addFiles,
      clearRejections: () => setRejections([]),
      startUpload: () => setIsBatchActive(true),
      retryItem,
      cancelItem,
      removeItem,
      clearCompleted,
      cancelAll,
    }),
    [
      items,
      rejections,
      isUploading,
      canStart,
      addFiles,
      retryItem,
      cancelItem,
      removeItem,
      clearCompleted,
      cancelAll,
    ],
  )
}
