import { lazy, Suspense, type ReactNode } from 'react'

import type { ChatMessageContent as MessageContent, ChatRole } from '../../model/types'

import styles from '../ChatMessage/ChatMessage.module.scss'

// Mermaid 体积较大，仅在回复中实际出现图表块时加载对应组件。
const MermaidViewer = lazy(async () => {
  const module = await import('../MermaidViewer/MermaidViewer')
  return { default: module.MermaidViewer }
})

interface ChatMessageContentProps {
  readonly content: readonly MessageContent[]
  readonly role: ChatRole
}

// 联合类型新增成员却未补充渲染分支时，在编译期和运行期都能尽早暴露问题。
function assertNever(content: never): never {
  throw new Error(`不支持的消息内容类型：${JSON.stringify(content)}`)
}

// 将单个领域内容块分派给文本或 Mermaid 渲染器，并保留消息内的原始顺序。
function renderContent(content: MessageContent, role: ChatRole, index: number): ReactNode {
  switch (content.type) {
    case 'text':
      return (
        <p
          key={`text-${index}`}
          className={[
            styles.chat,
            role === 'assistant' ? styles.assistantText : styles.userBubble,
          ].join(' ')}
        >
          {content.text}
        </p>
      )
    case 'mermaid':
      return (
        <Suspense
          key={`mermaid-${index}`}
          fallback={<p className={styles.contentLoading}>图表组件加载中…</p>}
        >
          <MermaidViewer source={content.source} />
        </Suspense>
      )
    default:
      return assertNever(content)
  }
}

// 渲染一条消息中的结构化内容块，角色仅影响纯文本的视觉样式。
export function ChatMessageContent({ content, role }: ChatMessageContentProps) {
  return content.map((block, index) => renderContent(block, role, index))
}
