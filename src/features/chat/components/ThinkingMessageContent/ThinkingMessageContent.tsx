import { useEffect, useState } from 'react'
import { Think } from '@ant-design/x'
import { XMarkdown } from '@ant-design/x-markdown'

import type { ChatMessageStatus } from '../../model/types'
import { MARKDOWN_CODE_COMPONENTS } from '../MarkdownCode/markdownCodeComponents'

import styles from './ThinkingMessageContent.module.scss'

interface ThinkingMessageContentProps {
  readonly text: string
  readonly completed: boolean
  readonly status: ChatMessageStatus
}

const STREAMING_ACTIVE = { hasNextChunk: true } as const
const STREAMING_FINISHED = { hasNextChunk: false } as const

// 仅在请求仍活跃且协议段尚未闭合时显示思考中的状态。
function isActiveThinking(completed: boolean, status: ChatMessageStatus): boolean {
  return !completed && ['loading', 'updating'].includes(status)
}

// 使用可折叠的 Think 展示推理过程，并在思考结束时自动收起一次。
export function ThinkingMessageContent({ text, completed, status }: ThinkingMessageContentProps) {
  const isThinking = isActiveThinking(completed, status)
  const [expanded, setExpanded] = useState(isThinking)

  useEffect(() => {
    setExpanded(isThinking)
  }, [isThinking])

  return (
    <Think
      className={styles.thinking}
      title={isThinking ? '正在思考' : '已思考'}
      loading={isThinking}
      expanded={expanded}
      onExpand={setExpanded}
    >
      <XMarkdown
        className={styles.thinkingMarkdown}
        components={MARKDOWN_CODE_COMPONENTS}
        content={text}
        disableDefaultStyles={['pre', 'code']}
        escapeRawHtml
        openLinksInNewTab
        streaming={isThinking ? STREAMING_ACTIVE : STREAMING_FINISHED}
      />
    </Think>
  )
}
