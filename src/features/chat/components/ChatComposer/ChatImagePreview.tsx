import { X } from 'lucide-react'

import type { ChatImageFile } from '../../model/types'
import styles from './ChatComposer.module.scss'

export interface SelectedChatImage {
  readonly id: string
  readonly file: File
  readonly previewUrl: string
  readonly status: 'uploading' | 'uploaded' | 'error'
  readonly uploadedImage?: ChatImageFile
  readonly uploadError?: string
}

interface ChatImagePreviewProps {
  readonly images: readonly SelectedChatImage[]
  readonly onRemove: (id: string) => void
  readonly onRetry: (id: string) => void
}

/** 展示发送前的图片缩略图，并提供可键盘操作的移除按钮。 */
export function ChatImagePreview({ images, onRemove, onRetry }: ChatImagePreviewProps) {
  if (images.length === 0) return null

  return (
    <div className={styles.imagePreviewList} aria-label="待发送图片" role="group">
      {images.map((image) => (
        <div className={styles.imagePreviewItem} key={image.id}>
          <img className={styles.imagePreview} src={image.previewUrl} alt={image.file.name} />
          <span className={styles.imagePreviewStatus} role="status" title={image.uploadError}>
            {image.status === 'uploading'
              ? '上传中…'
              : image.status === 'uploaded'
                ? '已上传'
                : '上传失败'}
          </span>
          {image.status === 'error' ? (
            <button
              type="button"
              className={styles.imagePreviewRetry}
              aria-label={`重试上传图片 ${image.file.name}`}
              onClick={() => onRetry(image.id)}
            >
              重试
            </button>
          ) : null}
          <button
            type="button"
            className={styles.imagePreviewRemove}
            aria-label={`移除图片 ${image.file.name}`}
            onClick={() => onRemove(image.id)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
