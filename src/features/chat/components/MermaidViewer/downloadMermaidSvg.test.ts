// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadMermaidSvg, serializeMermaidSvg } from './downloadMermaidSvg'

const createSvg = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 640 360')
  svg.style.cursor = 'move'
  svg.style.transform = 'scale(2) translate(10px, 20px)'
  svg.style.transformOrigin = '0 0'
  svg.innerHTML = '<g><text>流程图</text></g>'
  return svg
}

describe('Mermaid SVG 下载', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('导出完整尺寸并移除 Panzoom 交互样式', () => {
    const content = serializeMermaidSvg(createSvg())

    expect(content).toContain('width="640"')
    expect(content).toContain('height="360"')
    expect(content).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(content).toContain('流程图')
    expect(content).not.toContain('scale(2)')
    expect(content).not.toContain('cursor: move')
  })

  it('使用挂载的 Blob 链接触发下载并延迟释放地址', () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mermaid')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ): void {
      expect(this.href).toBe('blob:mermaid')
      expect(this.target).toBe('_blank')
    })

    downloadMermaidSvg(createSvg(), 'diagram.svg')

    expect(createObjectUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="diagram.svg"]')).toBeNull()
    expect(revokeObjectUrl).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:mermaid')
  })
})
