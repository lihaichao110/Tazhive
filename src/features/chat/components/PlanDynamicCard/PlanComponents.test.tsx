// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PlanActionButton,
  PlanActions,
  PlanCard,
  PlanImage,
  PlanList,
  PlanPoints,
} from './PlanComponents'

describe('PlanComponents', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('展示方案信息、图片、卖点和销售状态', () => {
    act(() =>
      root.render(
        <PlanList>
          <PlanCard groupCode="G0264" groupName="安享一生" title="家庭保障方案" hasSale>
            <PlanImage url="https://example.com/plan.png" altText="安享一生" />
            <PlanPoints items={['保障全面', '投保便捷']} />
            <PlanActions>
              <span>操作</span>
            </PlanActions>
          </PlanCard>
        </PlanList>,
      ),
    )

    expect(host.textContent).toContain('安享一生')
    expect(host.textContent).toContain('家庭保障方案')
    expect(host.textContent).toContain('可投保')
    expect(host.querySelector('img')?.alt).toBe('安享一生')
    expect(host.querySelectorAll('li')).toHaveLength(2)
    expect(host.querySelector('article')?.children[0].tagName).toBe('HEADER')
    expect(host.querySelector('article')?.children[1].tagName).toBe('IMG')
    expect(host.querySelector('ul')?.getAttribute('aria-label')).toBe('方案亮点')
  })

  it('图片加载失败后移除媒体区域', () => {
    act(() => root.render(<PlanImage url="https://example.com/broken.png" altText="方案图" />))
    const image = host.querySelector('img')
    act(() => image?.dispatchEvent(new Event('error')))
    expect(host.querySelector('img')).toBeNull()
  })

  it('缺少可选内容时仅展示方案标题且不留下空区域', () => {
    act(() =>
      root.render(
        <PlanList>
          <PlanCard groupCode="G0002" groupName="精简方案" title="" />
        </PlanList>,
      ),
    )

    expect(host.textContent).toBe('精简方案')
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('ul')).toBeNull()
    expect(host.querySelector('button')).toBeNull()
  })

  it('展示不可销售状态并保留多个操作按钮', () => {
    act(() =>
      root.render(
        <PlanCard groupCode="G0003" groupName="长期保障方案" title="寿险" hasSale={false}>
          <PlanActions>
            <PlanActionButton text="预核保" action={{ event: { name: 'plan_pre_underwrite' } }} />
            <PlanActionButton text="正式投保" action={{ event: { name: 'plan_apply' } }} />
          </PlanActions>
        </PlanCard>,
      ),
    )

    expect(host.textContent).toContain('暂不可投保')
    expect(host.querySelectorAll('button')).toHaveLength(2)
  })

  it('按钮使用模型样式并上报动作上下文', () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <PlanActionButton
          text="正式投保"
          backgroundColor="#028550"
          color="#ffffff"
          borderRadius="6px"
          action={{ event: { name: 'plan_apply', context: { group_code: 'G0264' } } }}
          onAction={onAction}
        />,
      ),
    )

    const button = host.querySelector('button')
    expect(button?.style.backgroundColor).toBe('#028550')
    act(() => button?.click())
    expect(onAction).toHaveBeenCalledWith('plan_apply', { group_code: 'G0264' })
  })
})
