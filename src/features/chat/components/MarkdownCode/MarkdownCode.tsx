import { Children, type ReactNode } from 'react'
import { CodeHighlighter } from '@ant-design/x'
import type { ComponentProps } from '@ant-design/x-markdown'

import styles from './MarkdownCode.module.scss'

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  cs: 'csharp',
  html: 'markup',
  js: 'javascript',
  md: 'markdown',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml',
  zsh: 'bash',
}

// 将围栏 info string 收敛为 CodeHighlighter 可按需加载的 Prism 语言名称。
function normalizeLanguage(infoString?: string): string | undefined {
  const language = infoString?.trim().split(/\s+/, 1)[0]?.toLowerCase()
  return language ? (LANGUAGE_ALIASES[language] ?? language) : undefined
}

// 代码内容在 XMarkdown 清洗后只应包含文本节点；忽略意外元素可避免复制出无意义字符串。
function getCodeText(children: ReactNode): string {
  return Children.toArray(children)
    .filter((child): child is string | number => ['string', 'number'].includes(typeof child))
    .join('')
}

// 区分行内与块级代码，仅将 Markdown 围栏代码交给 CodeHighlighter。
export function MarkdownCode({ block, children, className, lang }: ComponentProps) {
  if (!block) {
    return <code className={className}>{children}</code>
  }

  const code = getCodeText(children)

  return (
    <div className={styles.codeBlock}>
      <CodeHighlighter className={styles.codeHighlighter} lang={normalizeLanguage(lang)}>
        {code}
      </CodeHighlighter>
    </div>
  )
}

// 去除 XMarkdown 为围栏代码生成的 pre，避免 CodeHighlighter 的 div 被嵌套进 pre。
export function MarkdownPre({ children }: ComponentProps) {
  return children
}
