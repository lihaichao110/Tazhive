import { lazy, Suspense, type ReactNode } from 'react'
import { XMarkdown } from '@ant-design/x-markdown'

import type {
  ChatMessageContent as MessageContent,
  ChatMessageStatus,
  ChatRole,
} from '../../model/types'
import { MARKDOWN_CODE_COMPONENTS } from '../MarkdownCode/markdownCodeComponents'
import { ThinkingMessageContent } from '../ThinkingMessageContent/ThinkingMessageContent'

import styles from './ChatMessageContent.module.scss'

// Mermaid 体积较大，仅在回复中实际出现图表块时加载对应组件。
const MermaidViewer = lazy(async () => {
  const module = await import('../MermaidViewer/MermaidViewer')
  return { default: module.MermaidViewer }
})

interface ChatMessageContentProps {
  readonly content: readonly MessageContent[]
  readonly role: ChatRole
  readonly status: ChatMessageStatus
}

const STREAMING_ACTIVE = { hasNextChunk: true } as const
const STREAMING_FINISHED = { hasNextChunk: false } as const

// 联合类型新增成员却未补充渲染分支时，在编译期和运行期都能尽早暴露问题。
function assertNever(content: never): never {
  throw new Error(`不支持的消息内容类型：${JSON.stringify(content)}`)
}

// 只有正在生成的最后一个助手文本块可能包含未闭合语法，交由 XMarkdown 保留流式缓存。
function isActiveStreamingBlock(
  role: ChatRole,
  status: ChatMessageStatus,
  index: number,
  lastIndex: number,
): boolean {
  return role === 'assistant' && index === lastIndex && ['loading', 'updating'].includes(status)
}

// 将单个领域内容块分派给纯文本、Markdown 或 Mermaid 渲染器，并保留消息内的原始顺序。
function renderContent(
  content: MessageContent,
  role: ChatRole,
  status: ChatMessageStatus,
  index: number,
  lastIndex: number,
): ReactNode {
  switch (content.type) {
    case 'text': {
      if (role === 'assistant') {
        const streaming = isActiveStreamingBlock(role, status, index, lastIndex)
          ? STREAMING_ACTIVE
          : STREAMING_FINISHED

        return (
          <div key={`text-${index}`} className={styles.quotableText} data-quotable-text>
            <XMarkdown
              className={styles.assistantMarkdown}
              components={MARKDOWN_CODE_COMPONENTS}
              content={content.text}
              disableDefaultStyles={['pre', 'code']}
              escapeRawHtml
              openLinksInNewTab
              streaming={streaming}
            />
          </div>
        )
      }

      return (
        <p key={`text-${index}`} className={styles.userBubble} data-quotable-text>
          {content.text}
        </p>
      )
    }
    case 'mermaid':
      return (
        <Suspense
          key={`mermaid-${index}`}
          fallback={<p className={styles.contentLoading}>图表组件加载中…</p>}
        >
          <MermaidViewer source={content.source} />
        </Suspense>
      )
    case 'thinking':
      return (
        <ThinkingMessageContent
          key={`thinking-${index}`}
          text={content.text}
          completed={content.completed}
          status={status}
        />
      )
    default:
      return assertNever(content)
  }
}

// 渲染一条消息中的结构化内容块，助手文本支持安全的流式 Markdown 展示。
export function ChatMessageContent({ content, role, status }: ChatMessageContentProps) {
  const lastIndex = content.length - 1
  return content.map((block, index) => renderContent(block, role, status, index, lastIndex))
}
