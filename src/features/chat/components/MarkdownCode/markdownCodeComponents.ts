import type { XMarkdownProps } from '@ant-design/x-markdown'

import { MarkdownCode, MarkdownPre } from './MarkdownCode'

// 复用稳定引用，避免流式追加内容时反复重建 XMarkdown 的解析器与渲染器。
export const MARKDOWN_CODE_COMPONENTS: NonNullable<XMarkdownProps['components']> = {
  code: MarkdownCode,
  pre: MarkdownPre,
}
