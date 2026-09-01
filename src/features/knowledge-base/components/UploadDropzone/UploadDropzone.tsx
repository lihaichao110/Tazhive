import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { FileUp, FolderOpen } from 'lucide-react'

import styles from './UploadDropzone.module.scss'

import { FILE_ACCEPT_VALUE } from '../../model/fileValidation'

interface UploadDropzoneProps {
  readonly disabled: boolean
  readonly onFilesSelected: (files: readonly File[]) => void
}

// 提供拖拽、点击与键盘三种文件选择入口，不负责业务校验。
export function UploadDropzone({ disabled, onFilesSelected }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = (): void => {
    if (!disabled) inputRef.current?.click()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openPicker()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    setIsDragging(false)
    if (!disabled && event.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(event.dataTransfer.files))
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={FILE_ACCEPT_VALUE}
        multiple
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleChange}
      />
      <div
        className={styles.dropzone}
        data-dragging={isDragging}
        data-disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setIsDragging(false)
        }}
        onDrop={handleDrop}
      >
        <div className={styles.iconShell}>
          <FileUp size={28} aria-hidden="true" />
        </div>
        <div className={styles.copy}>
          <h2>把知识文件放到这里</h2>
          <p>拖拽文件到此区域，或从设备中选择</p>
        </div>
        <span className={styles.pickButton}>
          <FolderOpen size={17} aria-hidden="true" />
          选择文件
        </span>
        <p className={styles.hint}>支持 PDF、Office、TXT、Markdown、CSV、JSON · 单文件 50MB</p>
      </div>
    </>
  )
}
