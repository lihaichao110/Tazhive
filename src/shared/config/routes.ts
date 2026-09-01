export const APP_ROUTES = {
  home: '/',
  knowledgeBase: '/knowledge-base',
  mermaidPreview: '/mermaid-preview/:previewId',
} as const

// 统一生成 Mermaid 预览地址，避免 feature 与 app 分别维护路由格式。
export function getMermaidPreviewPath(previewId: string): string {
  return `/mermaid-preview/${encodeURIComponent(previewId)}`
}
