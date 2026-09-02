import { useMemo, useRef, type ChangeEvent } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { FileUp, Plus } from 'lucide-react'

import styles from './ChatComposer.module.scss'

const CHAT_ATTACHMENT_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
].join(',')

interface ChatAttachmentPickerProps {
  readonly disabled: boolean
  readonly onFileSelected: (file: File) => void
}

// 提供聊天附件的单文件选择入口；当前只返回本地 File，不承担上传职责。
export function ChatAttachmentPicker({ disabled, onFileSelected }: ChatAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const menu = useMemo<MenuProps>(
    () => ({
      items: [
        {
          key: 'upload-file',
          icon: <FileUp size={16} aria-hidden="true" />,
          label: '上传文件或图片',
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
    const file = event.target.files?.[0]
    if (file) onFileSelected(file)
    // 允许移除或替换后再次选择同名文件。
    event.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={CHAT_ATTACHMENT_ACCEPT}
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
