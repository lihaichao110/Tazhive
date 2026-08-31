import { describe, expect, it, vi } from 'vitest'

import {
  createConversationStore,
  INITIAL_CONVERSATIONS,
  selectActiveConversationTitle,
} from './conversationStore'

describe('conversationStore', () => {
  it('创建会话时规范化标题、置顶选中并递增重置版本', () => {
    const createId = vi.fn(() => 'new-conversation')
    const store = createConversationStore(createId)

    store.getState().createConversation('   ')
    expect(createId).not.toHaveBeenCalled()
    store.getState().createConversation('  新项目讨论  ')

    expect(store.getState().conversations[0]).toEqual({
      id: 'new-conversation',
      title: '新项目讨论',
      preview: '暂无消息',
      updatedAt: '刚刚',
    })
    expect(store.getState().selectedConversationId).toBe('new-conversation')
    expect(store.getState().sessionVersion).toBe(1)
    expect(selectActiveConversationTitle(store.getState())).toBe('新项目讨论')
  })

  it('选择已有会话时同步关闭侧边栏并忽略非法 ID', () => {
    const store = createConversationStore()
    store.getState().toggleSidebar()
    store.getState().selectConversation('travel-plan')

    expect(store.getState().selectedConversationId).toBe('travel-plan')
    expect(store.getState().isSidebarOpen).toBe(false)
    store.getState().selectConversation('missing')
    expect(store.getState().selectedConversationId).toBe('travel-plan')
  })

  it('重置后恢复完整初始导航状态', () => {
    const store = createConversationStore(() => 'new-conversation')
    store.getState().createConversation('新项目讨论')
    store.getState().toggleSidebar()
    store.getState().reset()

    expect(store.getState().conversations).toEqual(INITIAL_CONVERSATIONS)
    expect(store.getState().selectedConversationId).toBe('product-roadmap')
    expect(store.getState().isSidebarOpen).toBe(false)
    expect(store.getState().sessionVersion).toBe(0)
  })
})
