import mermaid from 'mermaid'

const MERMAID_CONFIG = {
  startOnLoad: false,
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

function ensureMermaidReady(): void {
  if (isMermaidReady) return

  mermaid.initialize(MERMAID_CONFIG)
  isMermaidReady = true
}

export async function renderMermaidDiagram(chartId: string, source: string): Promise<string> {
  ensureMermaidReady()
  const { svg } = await mermaid.render(chartId, source)
  return svg
}
