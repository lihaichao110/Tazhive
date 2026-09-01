// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createMermaidImageFilename,
  createMermaidPng,
  saveMermaidPng,
  serializeMermaidSvg,
} from './mermaidImageExport'
import { getMermaidImageErrorMessage, MermaidImageExportError } from './mermaidImageError'

function createTestSvg(viewBox = '0 0 100 50'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', viewBox)
  svg.innerHTML = '<g><text>流程图</text></g>'
  return svg
}

function mockImageLoad(result: 'error' | 'success'): void {
  vi.stubGlobal(
    'Image',
    class {
      onerror: ((event: Event) => void) | null = null
      onload: (() => void) | null = null

      set src(_value: string) {
        if (result === 'success') this.onload?.()
        else this.onerror?.(new Event('error'))
      }
    },
  )
}

function mockSvgObjectUrl(): void {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

describe('mermaidImageExport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('按 viewBox 序列化完整图形并移除预览变换', () => {
    const svg = createTestSvg('0 0 320 180')
    svg.setAttribute('style', 'transform: scale(2) translate(20px, 10px); cursor: move;')
    svg.setAttribute('transform', 'translate(10 20)')

    const result = serializeMermaidSvg(svg)

    expect(result.width).toBe(320)
    expect(result.height).toBe(180)
    expect(result.markup).toContain('width="320"')
    expect(result.markup).toContain('height="180"')
    expect(result.markup).toContain('流程图')
    expect(result.markup).not.toContain('scale(2)')
    expect(result.markup).not.toContain('translate(10 20)')
  })

  it('拒绝包含 HTML foreignObject 的 SVG', () => {
    const svg = createTestSvg()
    svg.innerHTML = '<foreignObject><div>HTML 标签</div></foreignObject>'

    expect(() => serializeMermaidSvg(svg)).toThrowError(
      expect.objectContaining({ code: 'unsupported-svg-content' }),
    )
  })

  it('将导出错误映射为具体的用户提示', () => {
    expect(
      getMermaidImageErrorMessage(new MermaidImageExportError('invalid-svg-size', 'invalid size')),
    ).toBe('图形尺寸异常，无法生成图片')
    expect(
      getMermaidImageErrorMessage(
        new MermaidImageExportError('svg-decode-failed', 'decode failed'),
      ),
    ).toBe('当前浏览器不支持将此图形导出为 PNG')
    expect(getMermaidImageErrorMessage(new Error('unknown'))).toBe('图片生成失败，请重试')
  })

  it('使用本地时间生成可识别的 PNG 文件名', () => {
    const filename = createMermaidImageFilename(new Date(2026, 7, 31, 9, 5, 7))
    expect(filename).toBe('mermaid-diagram-20260831-090507.png')
  })

  it('以最高两倍像素密度生成白底 PNG', async () => {
    const context = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'canvas'
        ? (canvas as unknown as HTMLCanvasElement)
        : originalCreateElement(tagName),
    )
    vi.stubGlobal('devicePixelRatio', 3)
    mockImageLoad('success')
    mockSvgObjectUrl()
    const svg = createTestSvg()

    const png = await createMermaidPng(svg)

    expect(png.type).toBe('image/png')
    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(100)
    expect(context.fillStyle).toBe('#ffffff')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 200, 100)
    expect(context.drawImage).toHaveBeenCalledOnce()
  })

  it('保留 SVG 解码失败阶段', async () => {
    mockImageLoad('error')
    mockSvgObjectUrl()

    await expect(createMermaidPng(createTestSvg())).rejects.toMatchObject({
      code: 'svg-decode-failed',
    })
  })

  it('保留 Canvas 不可用阶段', async () => {
    mockImageLoad('success')
    mockSvgObjectUrl()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'canvas'
        ? ({ getContext: () => null } as unknown as HTMLCanvasElement)
        : originalCreateElement(tagName),
    )

    await expect(createMermaidPng(createTestSvg())).rejects.toMatchObject({
      code: 'canvas-unavailable',
    })
  })

  it('保留 PNG 编码失败阶段', async () => {
    mockImageLoad('success')
    mockSvgObjectUrl()
    const canvas = {
      getContext: () => ({ drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: '' }),
      toBlob: (callback: BlobCallback) => callback(null),
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'canvas'
        ? (canvas as unknown as HTMLCanvasElement)
        : originalCreateElement(tagName),
    )

    await expect(createMermaidPng(createTestSvg())).rejects.toMatchObject({
      code: 'png-encode-failed',
    })
  })

  it('移动设备优先调用系统文件分享', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    vi.stubGlobal('navigator', { canShare: vi.fn(() => true), share })

    const result = await saveMermaidPng(new Blob(['png'], { type: 'image/png' }))

    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [expect.any(File)], title: 'Mermaid 图形' }),
    )
  })

  it('用户取消系统面板时不触发下载', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    vi.stubGlobal('navigator', {
      canShare: vi.fn(() => true),
      share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
    })

    const result = await saveMermaidPng(new Blob(['png'], { type: 'image/png' }))

    expect(result).toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })

  it('系统分享不可用时回退为浏览器下载', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:png')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    const result = await saveMermaidPng(new Blob(['png'], { type: 'image/png' }))

    expect(result).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
})
