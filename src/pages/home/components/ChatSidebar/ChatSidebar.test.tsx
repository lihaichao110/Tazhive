import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { DrawerProps } from 'antd'

import { ChatSidebar } from './ChatSidebar'

const { drawerCalls } = vi.hoisted(() => ({
  drawerCalls: [] as DrawerProps[],
}))

vi.mock('antd', () => ({
  Drawer: (props: DrawerProps) => {
    drawerCalls.push(props)
    return <div>{props.children}</div>
  },
}))

describe('ChatSidebar', () => {
  beforeEach(() => {
    drawerCalls.length = 0
  })

  it('配置左侧受控抽屉并展示 mock 对话', () => {
    const markup = renderToStaticMarkup(
      <ChatSidebar
        isOpen
        selectedConversationId="product-roadmap"
        onClose={() => undefined}
        onSelect={() => undefined}
      />,
    )
    const drawer = drawerCalls[0]

    expect(drawer?.open).toBe(true)
    expect(drawer?.placement).toBe('left')
    expect(drawer?.size).toBe('min(88vw, 320px)')
    expect(markup).toContain('产品路线图讨论')
    expect(markup).toContain('aria-current="page"')
  })

  it('将抽屉关闭事件交给页面层处理', () => {
    const onClose = vi.fn()
    renderToStaticMarkup(
      <ChatSidebar
        isOpen
        selectedConversationId="product-roadmap"
        onClose={onClose}
        onSelect={() => undefined}
      />,
    )

    drawerCalls[0]?.onClose?.({} as React.MouseEvent | React.KeyboardEvent)

    expect(onClose).toHaveBeenCalledOnce()
  })
})
