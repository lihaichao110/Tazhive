import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChatHeader } from './ChatHeader'

describe('ChatHeader', () => {
  it('展示风险提示并关联侧边栏状态', () => {
    const markup = renderToStaticMarkup(
      <ChatHeader isSidebarOpen onSidebarToggle={() => undefined} />,
    )

    expect(markup).toContain('AI生成可能会有误，注意核实')
    expect(markup).toContain('aria-controls="chat-conversation-sidebar"')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).not.toContain('分享对话')
  })
})
