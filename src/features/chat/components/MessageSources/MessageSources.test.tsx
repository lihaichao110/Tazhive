// @vitest-environment happy-dom

import { act, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourcesProps } from '@ant-design/x'

import type { ChatReference } from '../../model/types'
import { MessageSources } from './MessageSources'

const { requestDocumentChunk } = vi.hoisted(() => ({ requestDocumentChunk: vi.fn() }))
let latestSourcesProps: SourcesProps | null = null

vi.mock('../../api/getDocumentChunk', () => ({ requestDocumentChunk }))

vi.mock('@ant-design/x', () => ({
  Sources: (props: SourcesProps) => {
    latestSourcesProps = props
    return (
      <section data-testid="sources" data-title={String(props.title)}>
        {props.items?.map((item) => (
          <div key={item.key} data-url={item.url}>
            {item.title}
            <span>{item.description}</span>
          </div>
        ))}
      </section>
    )
  },
}))

interface DrawerStubProps {
  readonly open?: boolean
  readonly title?: ReactNode
  readonly children?: ReactNode
}

vi.mock('antd', () => ({
  Drawer: ({ open, title, children }: DrawerStubProps) =>
    open ? (
      <aside aria-label="文档来源详情">
        <h2>{title}</h2>
        {children}
      </aside>
    ) : null,
  Spin: () => <span>加载图标</span>,
  Alert: ({ message, description, action }: Record<string, ReactNode>) => (
    <div role="alert">
      {message}
      {description}
      {action}
    </div>
  ),
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}))

const references: readonly ChatReference[] = [
  {
    source_type: 'web',
    title: '官方公告',
    url: 'https://example.com/notice',
    snippet: '公告摘要',
    document_id: null,
    chunk_index: null,
  },
  {
    source_type: 'rag',
    title: '员工手册',
    url: '/untrusted/chunk-url',
    snippet: '请假制度摘要',
    document_id: 'doc-1',
    chunk_index: 3,
  },
]

describe('MessageSources', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    requestDocumentChunk.mockReset()
    latestSourcesProps = null
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('映射标题、摘要和 URL，RAG 来源不暴露接口链接', () => {
    act(() => root.render(<MessageSources references={references} />))

    expect(host.querySelector('[data-title]')?.getAttribute('data-title')).toBe('来源 2')
    expect(host.textContent).toContain('官方公告')
    expect(host.textContent).toContain('公告摘要')
    expect(latestSourcesProps?.items?.[0]?.url).toBe('https://example.com/notice')
    expect(latestSourcesProps?.items?.[1]?.url).toBeUndefined()
  })

  it('点击 RAG 来源立即展示加载态，请求成功后展示完整片段', async () => {
    let resolveChunk: (value: unknown) => void = () => undefined
    requestDocumentChunk.mockReturnValue(
      new Promise((resolve) => {
        resolveChunk = resolve
      }),
    )
    act(() => root.render(<MessageSources references={references} />))
    act(() => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="打开来源：员工手册"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('正在加载文档片段')
    expect(requestDocumentChunk).toHaveBeenCalledWith('doc-1', 3, expect.any(AbortSignal))

    await act(async () => {
      resolveChunk({
        document_id: 'doc-1',
        filename: '员工手册.pdf',
        file_type: 'pdf',
        chunk_index: 3,
        content: '第一行\n第二行',
      })
      await Promise.resolve()
    })
    expect(host.textContent).toContain('员工手册.pdf')
    expect(host.textContent).toContain('第一行\n第二行')
  })

  it('失败时展示错误并允许重试', async () => {
    requestDocumentChunk.mockRejectedValueOnce(new Error('片段不存在')).mockResolvedValueOnce({
      document_id: 'doc-1',
      filename: '员工手册.pdf',
      file_type: 'pdf',
      chunk_index: 3,
      content: '重试成功',
    })
    act(() => root.render(<MessageSources references={references} />))
    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="打开来源：员工手册"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(host.textContent).toContain('片段不存在')

    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="重试加载文档片段"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(requestDocumentChunk).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain('重试成功')
  })
})
