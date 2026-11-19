import { useMemo, useRef, type ChangeEvent } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { ImagePlus, Plus } from 'lucide-react'

import styles from './ChatComposer.module.scss'

interface ChatAttachmentPickerProps {
  readonly disabled: boolean
  readonly onFilesSelected: (files: readonly File[]) => void
}

// 只负责选择图片并将本地 File 列表交给 Composer 管理。
export function ChatAttachmentPicker({ disabled, onFilesSelected }: ChatAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const menu = useMemo<MenuProps>(
    () => ({
      items: [
        {
          key: 'upload-file',
          icon: <ImagePlus size={16} aria-hidden="true" />,
          label: '上传图片',
          disabled,
        },
      ],
      onClick: ({ key }) => {
        if (key === 'upload-file' && !disabled) inputRef.current?.click()
      },
    }),
    [disabled],
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    // 允许移除后再次选择同一批图片。
    event.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleChange}
      />
      <Dropdown menu={menu} placement="topLeft" trigger={['click']} disabled={disabled}>
        <button
          type="button"
          className={styles.toolButton}
          aria-label="添加附件"
          aria-haspopup="menu"
          title="添加附件"
          disabled={disabled}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </Dropdown>
    </>
  )
}
