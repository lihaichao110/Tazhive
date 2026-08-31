// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConversationStoreProvider } from './ConversationStoreProvider'
import { useConversationStore } from './useConversationStore'
import { createConversationStore } from '../model/conversationStore'

let host: HTMLDivElement
let root: Root

describe('ConversationStoreProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('selector 未变化时不会触发订阅组件重渲染', () => {
    const store = createConversationStore(() => 'new-conversation')
    let renderCount = 0

    function SidebarOpenObserver() {
      const isOpen = useConversationStore((state) => state.isSidebarOpen)
      renderCount += 1
      return <span>{String(isOpen)}</span>
    }

    act(() => {
      root.render(
        <ConversationStoreProvider store={store}>
          <SidebarOpenObserver />
        </ConversationStoreProvider>,
      )
    })
    expect(renderCount).toBe(1)

    act(() => store.getState().createConversation('新项目讨论'))
    expect(renderCount).toBe(1)

    act(() => store.getState().toggleSidebar())
    expect(renderCount).toBe(2)
  })
})
