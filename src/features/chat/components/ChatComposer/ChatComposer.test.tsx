import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DropdownProps, MenuProps } from 'antd'

import { ChatSessionTestProvider } from '../../providers/chatSessionTestUtils'
import { ChatComposer } from './ChatComposer'

const { dropdownCalls, navigateMock } = vi.hoisted(() => ({
  dropdownCalls: [] as DropdownProps[],
  navigateMock: vi.fn(),
}))

vi.mock('react-router', () => ({ useNavigate: () => navigateMock }))

vi.mock('antd', () => ({
  Dropdown: (props: DropdownProps) => {
    dropdownCalls.push(props)
    return <>{props.children}</>
  },
}))

vi.mock('@ant-design/x', () => {
  const Sender = ({ footer }: { readonly footer?: (node: ReactNode) => ReactNode }) => (
    <div>{footer?.(<button type="button">发送</button>)}</div>
  )
  Sender.Header = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>
  return { Sender }
})

type MenuClickInfo = Parameters<NonNullable<MenuProps['onClick']>>[0]

describe('ChatComposer 更多菜单', () => {
  beforeEach(() => {
    dropdownCalls.length = 0
    navigateMock.mockReset()
  })

  it('提供可访问的更多按钮与知识库菜单项', () => {
    const markup = renderToStaticMarkup(
      <ChatSessionTestProvider>
        <ChatComposer />
      </ChatSessionTestProvider>,
    )
    const knowledgeDropdown = dropdownCalls.find((call) =>
      call.menu?.items?.some((item) => item && 'key' in item && item.key === 'knowledge-base'),
    )

    expect(markup).toContain('aria-label="更多操作"')
    expect(markup).toContain('aria-haspopup="menu"')
    expect(knowledgeDropdown?.trigger).toEqual(['click'])
    expect(knowledgeDropdown?.placement).toBe('topLeft')
  })

  it('选择知识库后导航到上传工作台', () => {
    renderToStaticMarkup(
      <ChatSessionTestProvider>
        <ChatComposer />
      </ChatSessionTestProvider>,
    )
    const knowledgeDropdown = dropdownCalls.find((call) =>
      call.menu?.items?.some((item) => item && 'key' in item && item.key === 'knowledge-base'),
    )

    knowledgeDropdown?.menu?.onClick?.({ key: 'knowledge-base' } as MenuClickInfo)

    expect(navigateMock).toHaveBeenCalledWith('/knowledge-base')
  })
})
