import mermaid from 'mermaid'

// strict 模式负责过滤消息中潜在的不可信 Mermaid 内容，再将渲染结果交给 React 注入。
const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict' as const,
  theme: 'base' as const,
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#eef2ff',
    primaryBorderColor: '#818cf8',
    primaryTextColor: '#1f2937',
    secondaryColor: '#f5f3ff',
    tertiaryColor: '#ecfeff',
    lineColor: '#94a3b8',
    textColor: '#1f2937',
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  },
}

let isMermaidReady = false

// Mermaid 配置是全局状态，同一页面生命周期内只初始化一次以避免重复覆盖配置。
function ensureMermaidReady(): void {
  if (isMermaidReady) return

  mermaid.initialize(MERMAID_CONFIG)
  isMermaidReady = true
}

// 将 Mermaid 源码转换为可展示的 SVG，渲染错误由调用组件统一映射为失败状态。
export async function renderMermaidDiagram(chartId: string, source: string): Promise<string> {
  ensureMermaidReady()
  const { svg } = await mermaid.render(chartId, source)
  return svg
}
