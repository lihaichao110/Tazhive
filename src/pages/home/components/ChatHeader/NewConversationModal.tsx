import { useState } from 'react'
import { Input, Modal } from 'antd'

import styles from './NewConversationModal.module.scss'

interface NewConversationModalProps {
  readonly isOpen: boolean
  readonly onCancel: () => void
  readonly onConfirm: (title: string) => void
}

// 收集并校验新会话标题，关闭时始终丢弃尚未提交的输入。
export function NewConversationModal({ isOpen, onCancel, onConfirm }: NewConversationModalProps) {
  const [title, setTitle] = useState('')
  const normalizedTitle = title.trim()

  const handleCancel = () => {
    setTitle('')
    onCancel()
  }

  const handleConfirm = () => {
    if (!normalizedTitle) return
    onConfirm(normalizedTitle)
    setTitle('')
  }

  return (
    <Modal
      destroyOnHidden
      okButtonProps={{ disabled: !normalizedTitle }}
      okText="确认"
      open={isOpen}
      rootClassName={styles.modal}
      title="新建会话"
      cancelText="取消"
      onCancel={handleCancel}
      onOk={handleConfirm}
    >
      <Input
        autoFocus
        aria-label="会话标题"
        placeholder="请输入会话标题"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onPressEnter={handleConfirm}
      />
    </Modal>
  )
}
