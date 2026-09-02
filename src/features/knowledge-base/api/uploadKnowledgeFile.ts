import axios, { type AxiosProgressEvent } from 'axios'

import { createHttpClient } from '@/shared/api'

export interface UploadRequest {
  readonly promise: Promise<void>
  readonly abort: () => void
}

interface UploadKnowledgeFileOptions {
  readonly file: File
  readonly onProgress: (progress: number) => void
}

function getKnowledgeBaseUrl(): string {
  return import.meta.env.VITE_KNOWLEDGE_BASE_BASE_URL?.trim().replace(/\/$/, '') ?? ''
}

const knowledgeBaseClient = createHttpClient({ baseURL: getKnowledgeBaseUrl(), timeout: 120_000 })

function reportUploadProgress(
  event: AxiosProgressEvent,
  onProgress: (progress: number) => void,
): void {
  if (!event.total) return
  onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
}

// 使用 Axios 的 XHR 适配器上传单个文件，以保留真实进度和可取消能力。
export function uploadKnowledgeFile({
  file,
  onProgress,
}: UploadKnowledgeFileOptions): UploadRequest {
  const controller = new AbortController()
  const formData = new FormData()
  formData.append('files', file)

  const promise = knowledgeBaseClient
    .post<void>('/api/v1/documents/upload', formData, {
      adapter: 'xhr',
      signal: controller.signal,
      onUploadProgress: (event) => reportUploadProgress(event, onProgress),
    })
    .then(() => onProgress(100))
    .catch((error: unknown) => {
      if (axios.isCancel(error)) throw new DOMException('上传已取消', 'AbortError')
      throw error
    })

  return { promise, abort: () => controller.abort() }
}
