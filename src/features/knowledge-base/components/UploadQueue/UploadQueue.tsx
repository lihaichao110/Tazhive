import { File, FileCheck2, RotateCcw, Trash2, X } from 'lucide-react'

import styles from './UploadQueue.module.scss'

import type { KnowledgeUploadItem } from '../../model/types'

interface UploadQueueProps {
  readonly items: readonly KnowledgeUploadItem[]
  readonly onCancel: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onRetry: (id: string) => void
}

interface UploadQueueItemProps {
  readonly item: KnowledgeUploadItem
  readonly onCancel: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onRetry: (id: string) => void
}

const STATUS_LABELS = {
  queued: '等待上传',
  uploading: '正在上传',
  success: '已提交解析',
  error: '上传失败',
  canceled: '已取消',
} as const

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

// 渲染单个文件的实时状态，并提供与当前状态匹配的最小操作集合。
function UploadQueueItem({ item, onCancel, onRemove, onRetry }: UploadQueueItemProps) {
  return (
    <li className={styles.item} data-status={item.status}>
      <div className={styles.fileIcon}>
        {item.status === 'success' ? (
          <FileCheck2 size={22} aria-hidden="true" />
        ) : (
          <File size={22} aria-hidden="true" />
        )}
      </div>
      <div className={styles.fileContent}>
        <div className={styles.fileHeading}>
          <span className={styles.fileName} title={item.file.name}>
            {item.file.name}
          </span>
          <span className={styles.fileSize}>{formatFileSize(item.file.size)}</span>
        </div>
        <div className={styles.statusRow}>
          <span>{STATUS_LABELS[item.status]}</span>
          {item.status === 'uploading' ? <span>{item.progress}%</span> : null}
        </div>
        {item.status === 'uploading' ? (
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={`${item.file.name} 上传进度`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.progress}
          >
            <span style={{ width: `${item.progress}%` }} />
          </div>
        ) : null}
        {item.error ? (
          <p className={styles.error} role="alert">
            {item.error}
          </p>
        ) : null}
      </div>
      <div className={styles.actions}>
        {item.status === 'error' || item.status === 'canceled' ? (
          <button
            type="button"
            aria-label={`重试 ${item.file.name}`}
            onClick={() => onRetry(item.id)}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        ) : null}
        {item.status === 'uploading' ? (
          <button
            type="button"
            aria-label={`取消 ${item.file.name}`}
            onClick={() => onCancel(item.id)}
          >
            <X size={17} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`移除 ${item.file.name}`}
            onClick={() => onRemove(item.id)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

// 文件队列只负责状态呈现，上传调度由业务 Hook 统一管理。
export function UploadQueue({ items, onCancel, onRemove, onRetry }: UploadQueueProps) {
  return (
    <ul className={styles.list} aria-label="待处理文件">
      {items.map((item) => (
        <UploadQueueItem
          key={item.id}
          item={item}
          onCancel={onCancel}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </ul>
  )
}
