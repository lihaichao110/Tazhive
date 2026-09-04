// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DrawerProps } from 'antd'

import { ChatSidebar } from './ChatSidebar'

import {
  ConversationStoreProvider,
  createConversationStore,
  type ConversationStoreApi,
} from '@/features/chat'

const { drawerCalls, requestListThreads } = vi.hoisted(() => ({
  drawerCalls: [] as DrawerProps[],
  requestListThreads: vi.fn(),
}))

vi.mock('antd', () => ({
  Drawer: (props: DrawerProps) => {
    drawerCalls.push(props)
    return <div>{props.children}</div>
  },
}))

vi.mock('@/features/chat/api/listThreads', () => ({ requestListThreads }))

let host: HTMLDivElement
let root: Root

function renderSidebar(): ConversationStoreApi {
  const store = createConversationStore(() => 'new-conversation')
  act(() => {
    root.render(
      <ConversationStoreProvider store={store}>
        <ChatSidebar />
      </ConversationStoreProvider>,
    )
  })
  return store
}

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    drawerCalls.length = 0
    requestListThreads.mockReset()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('抽屉打开时拉取服务端列表并替换本地会话', async () => {
    requestListThreads.mockResolvedValue([
      {
        created_at: '2026-09-01T10:00:00Z',
        id: 'server-thread',
        status: 'active',
        title: '服务端会话',
        updated_at: '2026-09-02T10:00:00Z',
        user_id: 'user-1',
      },
    ])
    const store = renderSidebar()

    act(() => store.getState().toggleSidebar())
    await act(async () => {})

    const drawer = drawerCalls.at(-1)
    expect(drawer?.open).toBe(true)
    expect(drawer?.placement).toBe('left')
    expect(requestListThreads).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('服务端会话')
    expect(store.getState().conversations).toHaveLength(1)
  })

  it('抽屉关闭时不触发拉取', () => {
    requestListThreads.mockResolvedValue([])
    const store = renderSidebar()

    expect(store.getState().isSidebarOpen).toBe(false)
    expect(requestListThreads).not.toHaveBeenCalled()
  })

  it('拉取中展示加载状态', () => {
    requestListThreads.mockReturnValue(new Promise(() => {}))
    const store = renderSidebar()

    act(() => store.getState().toggleSidebar())

    expect(host.querySelector('[role="status"]')?.textContent).toContain('正在加载会话')
  })

  it('拉取失败时展示错误提示', async () => {
    requestListThreads.mockRejectedValue(new Error('网络连接异常，请检查后重试'))
    const store = renderSidebar()

    act(() => store.getState().toggleSidebar())
    await act(async () => {})

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('网络连接异常')
  })

  it('将抽屉关闭事件直接写回 Store', async () => {
    requestListThreads.mockResolvedValue([])
    const store = renderSidebar()
    act(() => store.getState().toggleSidebar())
    await act(async () => {})

    act(() => drawerCalls.at(-1)?.onClose?.({} as React.MouseEvent | React.KeyboardEvent))

    expect(store.getState().isSidebarOpen).toBe(false)
  })
})
