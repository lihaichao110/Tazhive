import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageLoading } from './PageLoading'

describe('PageLoading', () => {
  it('展示统一的页面加载状态并提供无障碍播报', () => {
    const html = renderToStaticMarkup(<PageLoading />)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('页面加载中…')
  })
})
