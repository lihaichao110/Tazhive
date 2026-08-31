// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DrawerProps } from 'antd'

import { ChatSidebar } from './ChatSidebar'

import { ConversationStoreProvider, createConversationStore } from '@/features/chat'

const { drawerCalls } = vi.hoisted(() => ({
  drawerCalls: [] as DrawerProps[],
}))

vi.mock('antd', () => ({
  Drawer: (props: DrawerProps) => {
    drawerCalls.push(props)
    return <div>{props.children}</div>
  },
}))

let host: HTMLDivElement
let root: Root

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    drawerCalls.length = 0
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('直接读取 Store 并展示动态会话列表', () => {
    const store = createConversationStore(() => 'new-conversation')
    store.getState().createConversation('新项目讨论')
    store.getState().toggleSidebar()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatSidebar />
        </ConversationStoreProvider>,
      )
    })
    const drawer = drawerCalls.at(-1)

    expect(drawer?.open).toBe(true)
    expect(drawer?.placement).toBe('left')
    expect(drawer?.size).toBe('min(88vw, 320px)')
    expect(host.textContent).toContain('新项目讨论')
    expect(host.querySelector('[aria-current="page"]')).not.toBeNull()
  })

  it('将抽屉关闭事件直接写回 Store', () => {
    const store = createConversationStore()
    store.getState().toggleSidebar()
    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <ChatSidebar />
        </ConversationStoreProvider>,
      )
    })

    act(() => drawerCalls.at(-1)?.onClose?.({} as React.MouseEvent | React.KeyboardEvent))

    expect(store.getState().isSidebarOpen).toBe(false)
  })
})
