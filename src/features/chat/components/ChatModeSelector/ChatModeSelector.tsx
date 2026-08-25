import { Dropdown, type MenuProps } from 'antd'
import { BrainCircuit, Check, Zap, type LucideIcon } from 'lucide-react'

import styles from './ChatModeSelector.module.scss'

import type { ChatMode } from '../../model/types'

interface ChatModeSelectorProps {
  readonly disabled: boolean
  readonly mode: ChatMode
  readonly onChange: (mode: ChatMode) => void
}

interface ChatModeOption {
  readonly icon: LucideIcon
  readonly label: string
}

const CHAT_MODE_OPTIONS: Record<ChatMode, ChatModeOption> = {
  fast: { icon: Zap, label: '快速' },
  deep: { icon: BrainCircuit, label: '深度思考' },
}

function isChatMode(key: string): key is ChatMode {
  return key === 'fast' || key === 'deep'
}

// 将弹层挂载到触发器容器，使 Portal 继续继承聊天页面内限定的主题令牌。
function getDropdownContainer(triggerNode: HTMLElement): HTMLElement {
  return triggerNode.parentElement ?? triggerNode
}

// 渲染单个模式菜单项，并在当前模式右侧提供明确的选中反馈。
function renderModeLabel(mode: ChatMode, selectedMode: ChatMode) {
  const option = CHAT_MODE_OPTIONS[mode]

  return (
    <span className={styles.menuLabel}>
      <span>{option.label}</span>
      {mode === selectedMode ? <Check size={16} aria-label="已选择" /> : null}
    </span>
  )
}

// 提供快速与深度思考两种响应模式；请求期间锁定，避免改变正在执行的请求预期。
export function ChatModeSelector({ disabled, mode, onChange }: ChatModeSelectorProps) {
  const currentOption = CHAT_MODE_OPTIONS[mode]
  const CurrentIcon = currentOption.icon
  const items: MenuProps['items'] = (Object.keys(CHAT_MODE_OPTIONS) as ChatMode[]).map((key) => {
    const OptionIcon = CHAT_MODE_OPTIONS[key].icon

    return {
      key,
      icon: <OptionIcon size={16} />,
      label: renderModeLabel(key, mode),
    }
  })

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (isChatMode(key)) onChange(key)
  }

  return (
    <Dropdown
      disabled={disabled}
      getPopupContainer={getDropdownContainer}
      placement="topLeft"
      trigger={['click']}
      classNames={{ root: styles.dropdown }}
      menu={{ items, onClick: handleClick, selectedKeys: [mode] }}
    >
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-label={`选择响应模式，当前为${currentOption.label}`}
        aria-haspopup="menu"
      >
        <CurrentIcon size={16} />
        <span>{currentOption.label}</span>
      </button>
    </Dropdown>
  )
}
