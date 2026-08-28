const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const OBJECT_URL_REVOKE_DELAY_MS = 1_000

const INTERACTION_STYLE_PROPERTIES = [
  'cursor',
  'touch-action',
  'transform',
  'transform-origin',
  'transition',
  'user-select',
] as const

const applyViewBoxSize = (svg: SVGSVGElement): void => {
  const values = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  if (values?.length !== 4) return

  const [, , width, height] = values
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return

  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
}

// 序列化完整 Mermaid 图表，并移除 Panzoom 仅用于屏幕交互的样式。
export function serializeMermaidSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NAMESPACE)
  clone.setAttribute('xmlns:xlink', XLINK_NAMESPACE)
  INTERACTION_STYLE_PROPERTIES.forEach((property) => clone.style.removeProperty(property))
  applyViewBoxSize(clone)

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`
}

const createDownloadFileName = (): string => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '')
  return `mermaid-${timestamp}.svg`
}

// 通过挂载到文档的 Blob 链接同步触发下载，兼容移动端浏览器的用户激活限制。
export function downloadMermaidSvg(svg: SVGSVGElement, fileName = createDownloadFileName()): void {
  const content = serializeMermaidSvg(svg)
  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = objectUrl
  link.hidden = true
  link.rel = 'noopener'
  link.target = '_blank'

  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_REVOKE_DELAY_MS)
}
