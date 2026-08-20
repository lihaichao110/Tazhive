import { useCallback, useState, type ReactNode } from 'react'
import { Sender } from '@ant-design/x'
import { LayoutGrid, Plus, Zap } from 'lucide-react'

import styles from './ChatComposer.module.scss'

interface ChatComposerProps {
  readonly isReplying: boolean
  readonly onSend: (text: string) => void
}

// 底部工具行：左侧为自定义工具按钮，右侧为 Sender 默认的语音与发送按钮。
function ComposerFooter({ actionNode }: { readonly actionNode: ReactNode }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <button type="button" className={styles.toolButton} aria-label="添加附件" title="添加附件">
          <Plus size={16} />
        </button>
        <button type="button" className={styles.toolButton} aria-label="快速操作" title="快速">
          <Zap size={16} />
          <span className={styles.toolLabel}>快速</span>
        </button>
        <button type="button" className={styles.toolButton} aria-label="更多操作" title="更多">
          <LayoutGrid size={16} />
          <span className={styles.toolLabel}>更多</span>
        </button>
      </div>
      {actionNode}
    </div>
  )
}

function renderComposerFooter(actionNode: ReactNode) {
  return <ComposerFooter actionNode={actionNode} />
}

export function ChatComposer({ isReplying, onSend }: ChatComposerProps) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(
    (content: string) => {
      const text = content.trim()
      // Sender 空值时禁用发送，这里兜底纯空白内容。
      if (!text) return
      onSend(text)
      setValue('')
    },
    [onSend],
  )

  return (
    <Sender
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      loading={isReplying}
      allowSpeech
      placeholder="发消息..."
      autoSize={{ minRows: 1, maxRows: 8 }}
      // suffix=false 移除输入行右侧的默认按钮组，改由 footer 承载，
      // 输入区独占一行全宽，避免移动端窄屏下被工具按钮挤压换行。
      suffix={false}
      footer={renderComposerFooter}
      classNames={{ root: styles.sender }}
    />
  )
}
