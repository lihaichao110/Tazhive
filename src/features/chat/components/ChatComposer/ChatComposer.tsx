import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Sender } from '@ant-design/x'
import type { SenderRef, SlotConfigType } from '@ant-design/x/es/sender'
import { Dropdown, type MenuProps } from 'antd'
import { Database, LayoutGrid, Paperclip, X } from 'lucide-react'
import { useNavigate } from 'react-router'

import styles from './ChatComposer.module.scss'
import { ChatAttachmentPicker } from './ChatAttachmentPicker'
import { ChatModeSelector } from '../ChatModeSelector/ChatModeSelector'

import { useChatSession } from '../../providers/useChatSession'
import { APP_ROUTES } from '@/shared/config'

const MORE_MENU_ITEMS: MenuProps['items'] = [
  {
    key: 'knowledge-base',
    icon: <Database size={16} aria-hidden="true" />,
    label: '知识库',
  },
]

const ATTACHMENT_SLOT_KEY = 'chat-attachment'
const ATTACHMENT_SLOT_MARKER = '[附件]'

interface ComposerFooterProps {
  readonly actionNode: ReactNode
  readonly attachmentNotice: string | null
  readonly attachmentDisabled: boolean
  readonly onFileSelected: (file: File) => void
}

interface ChatAttachment {
  readonly slotKey: string
  readonly file: File
}

function isAttachmentSlot(config: SlotConfigType): boolean {
  return config.key === ATTACHMENT_SLOT_KEY
}

// 底部工具行：左侧为自定义工具按钮，右侧为 Sender 默认的语音与发送按钮。
function ComposerFooter({
  actionNode,
  attachmentNotice,
  attachmentDisabled,
  onFileSelected,
}: ComposerFooterProps) {
  const { isReplying, mode, setMode } = useChatSession()
  const navigate = useNavigate()

  const handleMoreMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'knowledge-base') void navigate(APP_ROUTES.knowledgeBase)
  }

  return (
    <div className={styles.footerContent}>
      {attachmentNotice ? (
        <p className={styles.attachmentNotice} role="alert">
          {attachmentNotice}
        </p>
      ) : null}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <ChatAttachmentPicker disabled={attachmentDisabled} onFileSelected={onFileSelected} />
          <ChatModeSelector disabled={isReplying} mode={mode} onChange={setMode} />
          <Dropdown
            menu={{ items: MORE_MENU_ITEMS, onClick: handleMoreMenuClick }}
            placement="topLeft"
            trigger={['click']}
          >
            <button
              type="button"
              className={styles.toolButton}
              aria-label="更多操作"
              aria-haspopup="menu"
              title="更多"
            >
              <LayoutGrid size={16} />
              <span className={styles.toolLabel}>更多</span>
            </button>
          </Dropdown>
        </div>
        {actionNode}
      </div>
    </div>
  )
}

// 管理输入草稿、引用展示，并将发送与取消动作交给会话 Hook 处理。
export function ChatComposer() {
  const { abort, clearQuote, isReplying, quote, sendMessage } = useChatSession()
  const senderRef = useRef<SenderRef>(null)
  const [value, setValue] = useState('')
  const [editorSlots, setEditorSlots] = useState<SlotConfigType[]>([])
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null)

  // 移除附件词槽：先删 DOM 节点，再从干净的 DOM 重新推导剩余内容同步受控状态。
  // 限制：@ant-design/x 的 SlotTextArea 仅在 slotConfig 非空时才重建编辑器 DOM，
  // 空数组分支不会清理标签，且库内部的 removeSlot 未通过 SenderRef 暴露，
  // 因此这里对齐库内做法直接移除节点，保证仅剩附件时标签也能立即消失。
  // filter 兜底用于 nativeElement 不可用的场景（如测试替身），正常路径下 DOM 已删、过滤为空操作。
  const removeAttachment = useCallback((): void => {
    senderRef.current?.nativeElement
      ?.querySelectorAll(`[data-slot-key="${ATTACHMENT_SLOT_KEY}"]`)
      .forEach((node) => node.remove())
    const remaining = senderRef.current?.getValue()
    setValue(remaining?.value ?? '')
    setEditorSlots((remaining?.slotConfig ?? []).filter((config) => !isAttachmentSlot(config)))
    setAttachment(null)
    setAttachmentNotice(null)
  }, [])

  // 将本地文件表示为原子词槽；占位文本只用于启用发送按钮，不会进入请求。
  const createAttachmentSlot = useCallback(
    (file: File): SlotConfigType => ({
      type: 'tag',
      key: ATTACHMENT_SLOT_KEY,
      formatResult: () => ATTACHMENT_SLOT_MARKER,
      props: {
        value: file.name,
        label: (
          <span className={styles.fileSlot}>
            <Paperclip className={styles.fileSlotIcon} size={14} aria-hidden="true" />
            <span className={styles.fileSlotName} title={file.name}>
              {file.name}
            </span>
            <button
              type="button"
              className={styles.fileSlotRemove}
              aria-label={`移除附件 ${file.name}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation()
                removeAttachment()
              }}
            >
              <X className={styles.fileSlotRemoveIcon} size={12} aria-hidden="true" />
            </button>
          </span>
        ),
      },
    }),
    [removeAttachment],
  )

  // 单文件模式下，新选择会替换旧附件，并保留编辑器中的其他内容。
  const handleFileSelected = useCallback(
    (file: File): void => {
      const currentSlots = senderRef.current?.getValue().slotConfig ?? []
      const nextSlots = currentSlots.filter((config) => !isAttachmentSlot(config))
      nextSlots.push(createAttachmentSlot(file))
      setAttachment({ slotKey: ATTACHMENT_SLOT_KEY, file })
      setAttachmentNotice(`已选择 ${file.name}，文件上传能力待接入。`)
      setEditorSlots(nextSlots)
    },
    [createAttachmentSlot],
  )

  const renderFooter = useCallback(
    (actionNode: ReactNode) => (
      <ComposerFooter
        actionNode={actionNode}
        attachmentNotice={attachmentNotice}
        attachmentDisabled={isReplying}
        onFileSelected={handleFileSelected}
      />
    ),
    [attachmentNotice, handleFileSelected, isReplying],
  )

  const handleChange = useCallback(
    (nextValue: string, _event?: unknown, nextSlots: SlotConfigType[] = []): void => {
      setValue(nextValue)
      // 退格或剪切删除原子词槽时，同步释放本地文件引用。
      if (attachment && !nextSlots.some(isAttachmentSlot)) {
        setAttachment(null)
        setAttachmentNotice(null)
        setEditorSlots([...nextSlots])
      }
    },
    [attachment],
  )

  const handleSubmit = useCallback(
    (content: string, submittedSlots: SlotConfigType[] = []) => {
      if (attachment || submittedSlots.some(isAttachmentSlot)) {
        setAttachmentNotice('文件上传能力待接入，暂时无法随消息发送。')
        return
      }
      const text = content.trim()
      // Sender 空值时禁用发送，这里兜底纯空白内容。
      if (!text) return
      // 发送可能先经历首条消息建线程的异步等待；被拒绝时保留草稿，便于用户修复问题后重新发送。
      void Promise.resolve(sendMessage(text)).then((accepted) => {
        if (!accepted) return
        senderRef.current?.clear()
        setValue('')
        setEditorSlots([])
        setAttachment(null)
        setAttachmentNotice(null)
      })
    },
    [attachment, sendMessage],
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
            onClick={clearQuote}
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
      ref={senderRef}
      value={value}
      slotConfig={editorSlots}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={abort}
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
