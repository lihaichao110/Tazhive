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

const { drawerCalls, requestListThreads, abort } = vi.hoisted(() => ({
  drawerCalls: [] as DrawerProps[],
  requestListThreads: vi.fn(),
  abort: vi.fn(),
}))

vi.mock('antd', () => ({
  Drawer: (props: DrawerProps) => {
    drawerCalls.push(props)
    return <div>{props.children}</div>
  },
}))

vi.mock('@/features/chat/api/listThreads', () => ({ requestListThreads }))

vi.mock('@/features/chat/providers/useChatSession', () => ({
  useChatSession: () => ({ abort }),
}))

let host: HTMLDivElement
let root: Root

function renderSidebar(): ConversationStoreApi {
  const store = createConversationStore()
  act(() => {
    root.render(
      <ConversationStoreProvider store={store}>
        <ChatSidebar />
      </ConversationStoreProvider>,
    )
  })
  return store
}

function clickButton(label: string): void {
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent === label)
  if (!button) throw new Error(`未找到测试按钮：${label}`)
  act(() => button.click())
}

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    drawerCalls.length = 0
    requestListThreads.mockReset()
    abort.mockClear()
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

  it('拉取中展示品牌加载动画与场景文案', () => {
    requestListThreads.mockReturnValue(new Promise(() => {}))
    const store = renderSidebar()

    act(() => store.getState().toggleSidebar())

    expect(host.querySelector('[role="status"]')?.textContent).toContain('正在加载历史对话')
    expect(host.querySelector('img')?.getAttribute('src')).toContain('tazhive-running')
  })

  it('拉取失败时展示错误提示', async () => {
    requestListThreads.mockRejectedValue(new Error('网络连接异常，请检查后重试'))
    const store = renderSidebar()

    act(() => store.getState().toggleSidebar())
    await act(async () => {})

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('网络连接异常')
  })

  it('首次使用无会话记录时展示空状态指引', async () => {
    requestListThreads.mockResolvedValue([])
    const store = renderSidebar()

    act(() => store.getState().toggleSidebar())
    await act(async () => {})

    expect(host.textContent).toContain('还没有对话记录')
    expect(host.textContent).toContain('点击上方「新对话」')
    expect(store.getState().conversations).toHaveLength(0)
  })

  it('点击顶部新对话进入空白会话并终止旧回复', async () => {
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
    clickButton('新对话')

    expect(abort).toHaveBeenCalledOnce()
    expect(store.getState().selectedConversationId).toBe('')
    expect(store.getState().sessionVersion).toBe(1)
    expect(store.getState().isSidebarOpen).toBe(false)
    // 历史列表保留，供用户随时切回。
    expect(store.getState().conversations).toHaveLength(1)
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
