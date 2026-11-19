import type { ReactNode } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { Database, LayoutGrid } from 'lucide-react'
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

export interface ChatComposerFooterProps {
  readonly actionNode: ReactNode
  readonly attachmentNotice: string | null
  readonly attachmentDisabled: boolean
  readonly onFilesSelected: (files: readonly File[]) => void
}

/** 组合附件入口、提示、模式选择和发送操作。 */
export function ChatComposerFooter({
  actionNode,
  attachmentNotice,
  attachmentDisabled,
  onFilesSelected,
}: ChatComposerFooterProps) {
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
          <ChatAttachmentPicker disabled={attachmentDisabled} onFilesSelected={onFilesSelected} />
          <ChatModeSelector
            disabled={isReplying || attachmentDisabled}
            mode={mode}
            onChange={setMode}
          />
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
