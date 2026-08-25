import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { DropdownProps, MenuProps } from 'antd'

import { ChatModeSelector } from './ChatModeSelector'

const { dropdownCalls } = vi.hoisted(() => ({
  dropdownCalls: [] as DropdownProps[],
}))

vi.mock('antd', () => ({
  Dropdown: (props: DropdownProps) => {
    dropdownCalls.push(props)
    return <div>{props.children}</div>
  },
}))

type MenuClickInfo = Parameters<NonNullable<MenuProps['onClick']>>[0]

describe('ChatModeSelector', () => {
  beforeEach(() => {
    dropdownCalls.length = 0
  })

  it('默认展示快速模式并提供两个选项', () => {
    const markup = renderToStaticMarkup(
      <ChatModeSelector disabled={false} mode="fast" onChange={() => undefined} />,
    )
    const dropdown = dropdownCalls[0]

    expect(markup).toContain('快速')
    expect(markup).toContain('当前为快速')
    expect(dropdown?.getPopupContainer).toBeTypeOf('function')
    expect(dropdown?.placement).toBe('topLeft')
    expect(dropdown?.menu?.items).toHaveLength(2)
    expect(dropdown?.menu?.selectedKeys).toEqual(['fast'])
  })

  it('将弹层挂载到触发器容器以继承聊天页主题令牌', () => {
    renderToStaticMarkup(
      <ChatModeSelector disabled={false} mode="fast" onChange={() => undefined} />,
    )
    const parent = {} as HTMLElement
    const trigger = { parentElement: parent } as HTMLElement

    expect(dropdownCalls[0]?.getPopupContainer?.(trigger)).toBe(parent)
  })

  it('选择深度思考时通知上层更新模式', () => {
    const onChange = vi.fn()
    renderToStaticMarkup(<ChatModeSelector disabled={false} mode="fast" onChange={onChange} />)

    dropdownCalls[0]?.menu?.onClick?.({ key: 'deep' } as MenuClickInfo)

    expect(onChange).toHaveBeenCalledWith('deep')
  })

  it('回复期间同时禁用下拉与触发按钮', () => {
    const markup = renderToStaticMarkup(
      <ChatModeSelector disabled mode="deep" onChange={() => undefined} />,
    )

    expect(dropdownCalls[0]?.disabled).toBe(true)
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('深度思考')
  })
})
