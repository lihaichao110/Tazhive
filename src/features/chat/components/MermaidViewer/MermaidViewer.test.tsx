// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./MermaidDiagram', () => ({
  MermaidDiagram: ({ source }: { source: string }) => <div data-diagram-source={source} />,
}))

import { MermaidViewer } from './MermaidViewer'

function LocationProbe() {
  const location = useLocation()
  return <div data-path={location.pathname} data-source={location.state?.mermaidSource} />
}

let host: HTMLDivElement
let root: Root

describe('MermaidViewer', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')
    sessionStorage.clear()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('仅展示图片预览和查看完整内容入口', () => {
    const source = 'graph LR\nA-->B'
    act(() => {
      root.render(
        <MemoryRouter>
          <MermaidViewer source={source} />
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toContain('查看完整内容')
    expect(host.textContent).not.toContain('代码')
    expect(host.textContent).not.toContain('下载')
    expect(host.querySelector('[data-diagram-source]')?.getAttribute('data-diagram-source')).toBe(
      source,
    )
  })

  it('创建会话预览并跳转到全屏路由', () => {
    const source = 'sequenceDiagram\nA->>B: Hi'
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<MermaidViewer source={source} />} />
            <Route path="/mermaid-preview/:previewId" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      )
    })

    act(() => host.querySelector<HTMLButtonElement>('button')?.click())

    const probe = host.querySelector('[data-path]')
    expect(probe?.getAttribute('data-path')).toBe(
      '/mermaid-preview/11111111-1111-4111-8111-111111111111',
    )
    expect(probe?.getAttribute('data-source')).toBe(source)
    expect(sessionStorage.length).toBe(1)
  })
})
