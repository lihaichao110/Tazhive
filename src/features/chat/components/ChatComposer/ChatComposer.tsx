import { useCallback, useState, type ReactNode } from 'react'
import { Sender } from '@ant-design/x'
import { LayoutGrid, Plus, X } from 'lucide-react'

import styles from './ChatComposer.module.scss'
import { ChatModeSelector } from '../ChatModeSelector/ChatModeSelector'

import type { ChatMode, ChatQuote } from '../../model/types'

interface ChatComposerProps {
  readonly isReplying: boolean
  readonly mode: ChatMode
  readonly quote: ChatQuote | null
  readonly onCancel: () => void
  readonly onModeChange: (mode: ChatMode) => void
  readonly onQuoteClear: () => void
  readonly onSend: (text: string, quote?: ChatQuote) => boolean
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

// 管理输入草稿、引用展示，并将发送与取消动作交给会话 Hook 处理。
export function ChatComposer({
  isReplying,
  mode,
  quote,
  onCancel,
  onModeChange,
  onQuoteClear,
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
      if (onSend(text, quote ?? undefined)) {
        setValue('')
        onQuoteClear()
      }
    },
    [onQuoteClear, onSend, quote],
  )

  const quoteSource = quote?.role === 'assistant' ? '引用 AI 回答' : '引用你的问题'
  const quoteHeader = (
    <Sender.Header
      open={Boolean(quote)}
      closable={false}
      className={styles.quoteHeader}
      classNames={{ header: styles.quoteHeaderTitle, content: styles.quoteHeaderContent }}
      title={
        <div className={styles.quoteTitleRow}>
          <span>{quoteSource}</span>
          <button
            type="button"
            className={styles.quoteClose}
            aria-label="移除引用"
            onClick={onQuoteClear}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      }
    >
      <p className={styles.quoteText}>{quote?.text ?? ''}</p>
    </Sender.Header>
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
      header={quoteHeader}
      classNames={{ root: styles.sender }}
    />
  )
}
