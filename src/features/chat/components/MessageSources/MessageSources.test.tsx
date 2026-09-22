// @vitest-environment happy-dom

import { act, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatReference } from '../../model/types'
import { MessageSources } from './MessageSources'

const { requestDocumentChunk } = vi.hoisted(() => ({ requestDocumentChunk: vi.fn() }))

vi.mock('../../api/getDocumentChunk', () => ({ requestDocumentChunk }))

interface PopoverStubProps {
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly content?: ReactNode
  readonly children?: ReactNode
  readonly trigger?: string | readonly string[]
}

interface DrawerStubProps {
  readonly open?: boolean
  readonly title?: ReactNode
  readonly children?: ReactNode
  readonly onClose?: () => void
}

vi.mock('antd', () => ({
  Popover: ({ open, onOpenChange, content, children, trigger }: PopoverStubProps) => (
    <div data-popover-trigger={Array.isArray(trigger) ? trigger.join(',') : trigger}>
      {children}
      <button type="button" aria-label="切换来源浮层" onClick={() => onOpenChange?.(!open)} />
      {open ? <aside aria-label="引用来源浮层">{content}</aside> : null}
    </div>
  ),
  Drawer: ({ open, title, children, onClose }: DrawerStubProps) =>
    open ? (
      <aside aria-label="文档来源详情">
        <h2>{title}</h2>
        <button type="button" aria-label="关闭文档来源详情" onClick={onClose} />
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
  {
    source_type: 'wiki',
    title: '客服知识库',
    url: '/api/v1/documents/wiki-1/chunks/0',
    snippet: '银行客服电话摘要',
    document_id: 'wiki-1',
    chunk_index: 0,
  },
]

describe('MessageSources', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    requestDocumentChunk.mockReset()
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

  function openSources(): void {
    act(() => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="切换来源浮层"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  function nextSource(): void {
    act(() => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="下一个来源"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  it('按原顺序分页展示来源标题、摘要和数量', () => {
    act(() => root.render(<MessageSources references={references} />))
    openSources()

    expect(host.querySelector('[data-popover-trigger="click"]')).not.toBeNull()
    expect(host.textContent).toContain('引用来源数量 3条')
    expect(host.textContent).toContain('1/3')
    expect(host.textContent).toContain('官方公告')
    expect(host.textContent).toContain('公告摘要')

    nextSource()
    expect(host.textContent).toContain('2/3')
    expect(host.textContent).toContain('员工手册')
    expect(host.textContent).toContain('请假制度摘要')

    nextSource()
    expect(host.textContent).toContain('3/3')
    expect(host.textContent).toContain('客服知识库')
    expect(host.textContent).toContain('银行客服电话摘要')
  })

  it('点击 RAG 来源时关闭浮层并打开 Drawer，关闭后可再次展开', async () => {
    requestDocumentChunk.mockResolvedValue({
      document_id: 'doc-1',
      filename: '员工手册.pdf',
      file_type: 'pdf',
      chunk_index: 3,
      content: '第一行\n第二行',
    })
    act(() => root.render(<MessageSources references={references} />))
    openSources()
    nextSource()

    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="打开来源：员工手册"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(host.querySelector('[aria-label="引用来源浮层"]')).toBeNull()
    expect(host.querySelector('[aria-label="文档来源详情"]')).not.toBeNull()
    expect(requestDocumentChunk).toHaveBeenCalledWith('doc-1', 3, expect.any(AbortSignal))
    expect(host.textContent).toContain('员工手册.pdf')
    expect(host.textContent).toContain('第一行\n第二行')

    act(() => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="关闭文档来源详情"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    openSources()
    expect(host.querySelector('[aria-label="引用来源浮层"]')).not.toBeNull()
  })

  it('点击 Wiki 来源时通过文档标识加载完整片段', async () => {
    requestDocumentChunk.mockResolvedValue({
      document_id: 'wiki-1',
      filename: '客服知识库.md',
      file_type: 'md',
      chunk_index: 0,
      content: '完整 Wiki 内容',
    })
    act(() => root.render(<MessageSources references={references} />))
    openSources()
    nextSource()
    nextSource()

    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="打开来源：客服知识库"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(host.querySelector('[aria-label="引用来源浮层"]')).toBeNull()
    expect(requestDocumentChunk).toHaveBeenCalledWith('wiki-1', 0, expect.any(AbortSignal))
    expect(host.textContent).toContain('客服知识库.md')
    expect(host.textContent).toContain('完整 Wiki 内容')
  })

  it('点击 Web 来源时关闭浮层并在新窗口打开链接', () => {
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(null)
    act(() => root.render(<MessageSources references={references} />))
    openSources()

    act(() => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="打开来源：官方公告"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.querySelector('[aria-label="引用来源浮层"]')).toBeNull()
    expect(openWindow).toHaveBeenCalledWith(
      'https://example.com/notice',
      '_blank',
      'noopener,noreferrer',
    )
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
    openSources()
    nextSource()
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
