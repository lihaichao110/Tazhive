import { MermaidImageExportError } from './mermaidImageError'

const MAX_PIXEL_RATIO = 2
const MAX_CANVAS_EDGE = 8_192
const MAX_CANVAS_PIXELS = 32_000_000

interface SvgExportData {
  readonly height: number
  readonly markup: string
  readonly width: number
}

export type MermaidImageSaveResult = 'cancelled' | 'downloaded' | 'shared'

function readPositiveNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

// 优先读取 viewBox，确保导出完整图形而不是当前缩放后的可视区域。
function readSvgSize(svg: SVGSVGElement): { readonly width: number; readonly height: number } {
  const viewBox = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)

  if (
    viewBox?.length === 4 &&
    Number.isFinite(viewBox[2]) &&
    Number.isFinite(viewBox[3]) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] }
  }

  const width = readPositiveNumber(svg.getAttribute('width'))
  const height = readPositiveNumber(svg.getAttribute('height'))
  if (width && height) return { width, height }

  const bounds = svg.getBoundingClientRect()
  if (bounds.width > 0 && bounds.height > 0) {
    return { width: bounds.width, height: bounds.height }
  }

  throw new MermaidImageExportError('invalid-svg-size', '无法确定 Mermaid 图形尺寸')
}

// 生成不含预览缩放状态的独立 SVG 文本，供 Canvas 安全栅格化。
export function serializeMermaidSvg(svg: SVGSVGElement): SvgExportData {
  if (svg.querySelector('foreignObject')) {
    throw new MermaidImageExportError(
      'unsupported-svg-content',
      'Mermaid SVG 包含浏览器无法稳定栅格化的 HTML 内容',
    )
  }

  const { width, height } = readSvgSize(svg)
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.removeAttribute('style')
  clone.removeAttribute('transform')
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  return {
    width,
    height,
    markup: new XMLSerializer().serializeToString(clone),
  }
}

function calculateScale(width: number, height: number): number {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
  const edgeScale = Math.min(MAX_CANVAS_EDGE / width, MAX_CANVAS_EDGE / height)
  const areaScale = Math.sqrt(MAX_CANVAS_PIXELS / (width * height))
  return Math.min(pixelRatio, edgeScale, areaScale)
}

function loadSvgImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = (event) =>
      reject(new MermaidImageExportError('svg-decode-failed', 'Mermaid SVG 加载失败', event))
    image.src = url
  })
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new MermaidImageExportError('png-encode-failed', 'PNG 图片生成失败'))
    }, 'image/png')
  })
}

// 将 Mermaid SVG 栅格化为带白色背景的 PNG，并限制输出尺寸以保护移动端内存。
export async function createMermaidPng(svg: SVGSVGElement): Promise<Blob> {
  const { markup, width, height } = serializeMermaidSvg(svg)
  const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  let svgUrl: string

  try {
    svgUrl = URL.createObjectURL(svgBlob)
  } catch (error) {
    throw new MermaidImageExportError('svg-decode-failed', '无法创建 SVG 图片资源', error)
  }

  try {
    const image = await loadSvgImage(svgUrl)
    const scale = calculateScale(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      throw new MermaidImageExportError('canvas-unavailable', '浏览器不支持 Canvas 图片导出')
    }

    try {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      return await canvasToPng(canvas)
    } catch (error) {
      if (error instanceof MermaidImageExportError) throw error
      throw new MermaidImageExportError('png-encode-failed', 'PNG 图片绘制或编码失败', error)
    }
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

// 文件名使用本地时间，方便用户在相册或下载目录中识别。
export function createMermaidImageFilename(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  const datePart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `mermaid-diagram-${datePart}-${timePart}.png`
}

function isMobileLikeDevice(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

// 移动设备优先调起系统存图面板；能力缺失或调用失败时回退为浏览器下载。
export async function saveMermaidPng(blob: Blob): Promise<MermaidImageSaveResult> {
  const filename = createMermaidImageFilename()
  let shareData: ShareData | null = null
  let canShareFile = false

  try {
    const file = new File([blob], filename, { type: 'image/png' })
    shareData = { files: [file], title: 'Mermaid 图形' }
  } catch {
    // 不支持 File 时仍可继续使用普通 Blob 下载。
  }

  if (shareData && isMobileLikeDevice() && typeof navigator.canShare === 'function') {
    try {
      canShareFile = navigator.canShare(shareData)
    } catch {
      canShareFile = false
    }
  }

  if (shareData && canShareFile && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch (error) {
      if (isShareCancelled(error)) return 'cancelled'
    }
  }

  try {
    downloadBlob(blob, filename)
    return 'downloaded'
  } catch (error) {
    throw new MermaidImageExportError('file-save-failed', '浏览器未能开始图片下载', error)
  }
}
