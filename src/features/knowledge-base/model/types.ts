export type KnowledgeFileStatus = 'queued' | 'uploading' | 'success' | 'error' | 'canceled'

export interface KnowledgeUploadItem {
  readonly id: string
  readonly file: File
  readonly progress: number
  readonly status: KnowledgeFileStatus
  readonly error?: string
}

export interface FileRejection {
  readonly fileName: string
  readonly reason: string
}

export interface FileValidationResult {
  readonly accepted: File[]
  readonly rejected: FileRejection[]
}
