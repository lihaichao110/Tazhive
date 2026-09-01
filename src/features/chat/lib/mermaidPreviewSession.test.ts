// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMermaidPreview, readMermaidPreview } from './mermaidPreviewSession'

const PREVIEW_ID = '11111111-1111-4111-8111-111111111111'

describe('mermaidPreviewSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('在当前会话中保存并恢复 Mermaid 源码', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(PREVIEW_ID)

    const previewId = createMermaidPreview('graph TD\nA-->B')

    expect(previewId).toBe(PREVIEW_ID)
    expect(readMermaidPreview(previewId)).toBe('graph TD\nA-->B')
  })

  it('存储内容损坏或不可访问时返回 null', () => {
    sessionStorage.setItem(`tazhive:mermaid-preview:${PREVIEW_ID}`, '{invalid')
    expect(readMermaidPreview(PREVIEW_ID)).toBeNull()

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(readMermaidPreview(PREVIEW_ID)).toBeNull()
  })

  it('写入失败时仍返回路由兜底所需的预览 ID', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(PREVIEW_ID)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })

    expect(createMermaidPreview('graph LR\nA-->B')).toBe(PREVIEW_ID)
  })
})
