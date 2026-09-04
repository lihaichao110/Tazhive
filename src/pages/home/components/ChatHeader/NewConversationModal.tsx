import { useState } from 'react'
import { Input, Modal } from 'antd'

import styles from './NewConversationModal.module.scss'

interface NewConversationModalProps {
  readonly isOpen: boolean
  readonly onCancel: () => void
  readonly onConfirm: (title: string) => void | Promise<void>
}

// 收集并校验新会话标题，关闭时始终丢弃尚未提交的输入。
export function NewConversationModal({ isOpen, onCancel, onConfirm }: NewConversationModalProps) {
  const [title, setTitle] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const normalizedTitle = title.trim()

  const handleCancel = () => {
    setTitle('')
    onCancel()
  }

  // 等待创建请求完成，期间锁定表单以避免重复提交同一会话。
  const handleConfirm = async () => {
    if (!normalizedTitle || isConfirming) return
    setIsConfirming(true)
    try {
      await onConfirm(normalizedTitle)
      setTitle('')
    } catch {
      // 请求层负责展示错误；保留标题，让用户结束等待后可以直接重试。
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Modal
      destroyOnHidden
      cancelButtonProps={{ disabled: isConfirming }}
      confirmLoading={isConfirming}
      okButtonProps={{ disabled: !normalizedTitle || isConfirming }}
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
        disabled={isConfirming}
        placeholder="请输入会话标题"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onPressEnter={handleConfirm}
      />
    </Modal>
  )
}
