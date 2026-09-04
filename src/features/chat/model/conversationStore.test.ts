import { describe, expect, it } from 'vitest'

import {
  createConversationStore,
  INITIAL_CONVERSATIONS,
  selectActiveConversationTitle,
  type ConversationSummary,
} from './conversationStore'

function createSummary(id: string, title = id): ConversationSummary {
  return { id, title, preview: '暂无消息', updatedAt: '刚刚' }
}

describe('conversationStore', () => {
  it('初始状态为空列表且无选中会话', () => {
    const store = createConversationStore()

    expect(store.getState().conversations).toEqual(INITIAL_CONVERSATIONS)
    expect(store.getState().conversations).toHaveLength(0)
    expect(store.getState().selectedConversationId).toBe('')
    expect(store.getState().sessionVersion).toBe(0)
  })

  it('首条消息绑定服务端线程时置顶选中且不重建聊天会话', () => {
    const store = createConversationStore()
    store.getState().adoptConversation('server-thread', '  首条消息标题  ')

    expect(store.getState().conversations[0]).toEqual({
      id: 'server-thread',
      title: '首条消息标题',
      preview: '暂无消息',
      updatedAt: '刚刚',
    })
    expect(store.getState().selectedConversationId).toBe('server-thread')
    expect(store.getState().sessionVersion).toBe(0)
    expect(selectActiveConversationTitle(store.getState())).toBe('首条消息标题')

    store.getState().adoptConversation('', '空 ID')
    store.getState().adoptConversation('server-thread', '   ')
    expect(store.getState().conversations).toHaveLength(1)
  })

  it('进入新会话时清空选中并递增重建版本，同时保留历史列表', () => {
    const store = createConversationStore()
    store.getState().adoptConversation('server-thread', '既有会话')
    store.getState().toggleSidebar()

    store.getState().startNewConversation()

    expect(store.getState().selectedConversationId).toBe('')
    expect(store.getState().sessionVersion).toBe(1)
    expect(store.getState().conversations).toHaveLength(1)
    expect(store.getState().isSidebarOpen).toBe(true)
  })

  it('服务端空列表会清空选中，非空列表优先保留当前选中项', () => {
    const store = createConversationStore()
    store.getState().setConversations([createSummary('a'), createSummary('b')])
    expect(store.getState().selectedConversationId).toBe('a')

    store.getState().selectConversation('b')
    store.getState().setConversations([createSummary('a'), createSummary('b')])
    expect(store.getState().selectedConversationId).toBe('b')

    store.getState().setConversations([])
    expect(store.getState().conversations).toHaveLength(0)
    expect(store.getState().selectedConversationId).toBe('')
  })

  it('选择已有会话时同步关闭侧边栏并忽略非法 ID', () => {
    const store = createConversationStore()
    store.getState().setConversations([createSummary('travel-plan')])
    store.getState().toggleSidebar()
    store.getState().selectConversation('travel-plan')

    expect(store.getState().selectedConversationId).toBe('travel-plan')
    expect(store.getState().isSidebarOpen).toBe(false)
    store.getState().selectConversation('missing')
    expect(store.getState().selectedConversationId).toBe('travel-plan')
  })

  it('重置后恢复完整初始导航状态', () => {
    const store = createConversationStore()
    store.getState().adoptConversation('server-thread', '新项目讨论')
    store.getState().toggleSidebar()
    store.getState().startNewConversation()
    store.getState().reset()

    expect(store.getState().conversations).toEqual([])
    expect(store.getState().selectedConversationId).toBe('')
    expect(store.getState().isSidebarOpen).toBe(false)
    expect(store.getState().sessionVersion).toBe(0)
  })
})
