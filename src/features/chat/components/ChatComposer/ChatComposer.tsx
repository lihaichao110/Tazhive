import { useCallback, useState, type ReactNode } from 'react'
import { Sender } from '@ant-design/x'
import { LayoutGrid, Plus } from 'lucide-react'

import styles from './ChatComposer.module.scss'
import { ChatModeSelector } from '../ChatModeSelector/ChatModeSelector'

import type { ChatMode } from '../../model/types'

interface ChatComposerProps {
  readonly isReplying: boolean
  readonly mode: ChatMode
  readonly onCancel: () => void
  readonly onModeChange: (mode: ChatMode) => void
  readonly onSend: (text: string) => boolean
}

// 底部工具行：左侧为自定义工具按钮，右侧为 Sender 默认的语音与发送按钮。
function ComposerFooter({
  actionNode,
  isReplying,
  mode,
  onModeChange,
}: {
  readonly actionNode: ReactNode
  readonly isReplying: boolean
  readonly mode: ChatMode
  readonly onModeChange: (mode: ChatMode) => void
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <button type="button" className={styles.toolButton} aria-label="添加附件" title="添加附件">
          <Plus size={16} />
        </button>
        <ChatModeSelector disabled={isReplying} mode={mode} onChange={onModeChange} />
        <button type="button" className={styles.toolButton} aria-label="更多操作" title="更多">
          <LayoutGrid size={16} />
          <span className={styles.toolLabel}>更多</span>
        </button>
      </div>
      {actionNode}
    </div>
  )
}

// 管理输入草稿，并将发送与取消动作交给会话 Hook 处理。
export function ChatComposer({
  isReplying,
  mode,
  onCancel,
  onModeChange,
  onSend,
}: ChatComposerProps) {
  const [value, setValue] = useState('')

  const renderFooter = useCallback(
    (actionNode: ReactNode) => (
      <ComposerFooter
        actionNode={actionNode}
        isReplying={isReplying}
        mode={mode}
        onModeChange={onModeChange}
      />
    ),
    [isReplying, mode, onModeChange],
  )

  const handleSubmit = useCallback(
    (content: string) => {
      const text = content.trim()
      // Sender 空值时禁用发送，这里兜底纯空白内容。
      if (!text) return
      // 配置缺失或请求被拒绝时保留草稿，便于用户修复问题后重新发送。
      if (onSend(text)) setValue('')
    },
    [onSend],
  )

  return (
    <Sender
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      loading={isReplying}
      allowSpeech
      placeholder="发消息..."
      autoSize={{ minRows: 1, maxRows: 8 }}
      // suffix=false 移除输入行右侧的默认按钮组，改由 footer 承载，
      // 输入区独占一行全宽，避免移动端窄屏下被工具按钮挤压换行。
      suffix={false}
      footer={renderFooter}
      classNames={{ root: styles.sender }}
    />
  )
}
