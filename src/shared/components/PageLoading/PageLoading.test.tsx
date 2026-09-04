import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageLoading } from './PageLoading'

describe('PageLoading', () => {
  it('展示品牌动画并提供无障碍播报与低动态静态资源', () => {
    const html = renderToStaticMarkup(<PageLoading />)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('小塔正在赶来…')
    expect(html).toContain('tazhive-running.gif')
    expect(html).toContain('tazhive-running.png')
    expect(html).toContain('media="(prefers-reduced-motion: reduce)"')
  })

  it('支持场景化文案与局部内容区形态', () => {
    const html = renderToStaticMarkup(<PageLoading label="正在加载历史对话…" variant="inline" />)

    expect(html).toContain('正在加载历史对话…')
    expect(html).not.toContain('小塔正在赶来…')
    expect(html).toContain('inline')
  })
})
