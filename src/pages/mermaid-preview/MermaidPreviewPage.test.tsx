// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createMermaidPngMock, getMermaidImageErrorMessageMock, saveMermaidPngMock } = vi.hoisted(
  () => ({
    createMermaidPngMock: vi.fn(),
    getMermaidImageErrorMessageMock: vi.fn(),
    saveMermaidPngMock: vi.fn(),
  }),
)

vi.mock('@ant-design/x', () => ({
  CodeHighlighter: ({ children }: { children: string }) => <pre data-code>{children}</pre>,
}))

vi.mock('./mermaidImageExport', () => ({
  createMermaidPng: createMermaidPngMock,
  saveMermaidPng: saveMermaidPngMock,
}))

vi.mock('./mermaidImageError', () => ({
  getMermaidImageErrorMessage: getMermaidImageErrorMessageMock,
}))

vi.mock('@/features/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/chat')>()
  return {
    ...actual,
    MermaidDiagram: ({ source }: { source: string }) => (
      <div data-image>
        <svg viewBox="0 0 100 50">
          <text>{source}</text>
        </svg>
      </div>
    ),
  }
})

import { MermaidPreviewPage } from './MermaidPreviewPage'

let host: HTMLDivElement
let root: Root

function renderPage(state?: unknown): void {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[{ pathname: '/mermaid-preview/preview-id', state }]}>
        <Routes>
          <Route path="/" element={<div data-home>首页</div>} />
          <Route path="/mermaid-preview/:previewId" element={<MermaidPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

describe('MermaidPreviewPage', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.clearAllMocks()
    createMermaidPngMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    getMermaidImageErrorMessageMock.mockReturnValue('当前浏览器不支持将此图形导出为 PNG')
    saveMermaidPngMock.mockResolvedValue('downloaded')
    sessionStorage.clear()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('默认展示图片并允许在图片和代码之间切换', async () => {
    const source = 'graph LR\nA-->B'
    renderPage({ mermaidSource: source })
    await act(async () => Promise.resolve())

    expect(host.querySelector('[data-image]')?.textContent).toBe(source)
    expect(host.querySelector<HTMLButtonElement>('[aria-label^="分享"]')?.disabled).toBe(true)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="下载图片"]')?.disabled).toBe(false)

    const codeTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent === '代码',
    )
    act(() => codeTab?.click())
    expect(host.querySelector('[data-code]')?.textContent).toBe(source)
    expect(host.querySelector('[data-image]')).not.toBeNull()
    expect(host.querySelector<HTMLButtonElement>('[aria-label="下载图片"]')?.disabled).toBe(false)

    const imageTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent === '图片',
    )
    act(() => imageTab?.click())
    expect(host.querySelector('[data-image]')?.textContent).toBe(source)
  })

  it('在代码模式中仍可下载已渲染的图形', async () => {
    renderPage({ mermaidSource: 'graph LR\nA-->B' })
    await act(async () => Promise.resolve())

    const codeTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent === '代码',
    )
    act(() => codeTab?.click())

    const downloadButton = host.querySelector<HTMLButtonElement>('[aria-label="下载图片"]')
    await act(async () => downloadButton?.click())

    expect(createMermaidPngMock).toHaveBeenCalledWith(host.querySelector('[data-image] svg'))
    expect(saveMermaidPngMock).toHaveBeenCalledOnce()
    expect(codeTab?.getAttribute('aria-selected')).toBe('true')
  })

  it('生成期间阻止重复下载并在失败时提示', async () => {
    let rejectExport: ((reason: Error) => void) | undefined
    createMermaidPngMock.mockImplementationOnce(
      () =>
        new Promise<Blob>((_resolve, reject) => {
          rejectExport = reject
        }),
    )
    renderPage({ mermaidSource: 'graph LR\nA-->B' })
    await act(async () => Promise.resolve())

    const downloadButton = host.querySelector<HTMLButtonElement>('[aria-label="下载图片"]')
    act(() => {
      downloadButton?.click()
      downloadButton?.click()
    })
    expect(createMermaidPngMock).toHaveBeenCalledOnce()
    expect(host.querySelector<HTMLButtonElement>('[aria-label="正在生成图片"]')?.disabled).toBe(
      true,
    )

    const exportError = new Error('export failed')
    await act(async () => rejectExport?.(exportError))
    expect(getMermaidImageErrorMessageMock).toHaveBeenCalledWith(exportError)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      '当前浏览器不支持将此图形导出为 PNG',
    )
  })

  it('优先从会话存储恢复刷新后的内容', () => {
    sessionStorage.setItem(
      'tazhive:mermaid-preview:preview-id',
      JSON.stringify({ source: 'flowchart TD\nA-->B' }),
    )
    renderPage()

    expect(host.querySelector('[data-image]')?.textContent).toBe('flowchart TD\nA-->B')
  })

  it('内容失效时提示用户并可返回首页', () => {
    renderPage()
    expect(host.textContent).toContain('预览内容已失效')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="下载图片"]')?.disabled).toBe(true)

    const returnButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '返回聊天',
    )
    act(() => returnButton?.click())
    expect(host.querySelector('[data-home]')).not.toBeNull()
  })
})
