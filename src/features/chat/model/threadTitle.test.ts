import { describe, expect, it } from 'vitest'

import { deriveThreadTitle } from './threadTitle'

describe('deriveThreadTitle', () => {
  it('短消息直接作为标题并折叠多余空白', () => {
    expect(deriveThreadTitle('帮我整理\n下季度的  产品优先级')).toBe('帮我整理 下季度的 产品优先级')
  })

  it('超长消息截断到上限并追加省略号', () => {
    const title = deriveThreadTitle(
      '这是一段非常长的第一条消息需要被截断成一个适合侧边栏展示的短标题',
    )

    expect(Array.from(title)).toHaveLength(21)
    expect(title.endsWith('…')).toBe(true)
  })

  it('按码点截断，不切断 emoji', () => {
    const title = deriveThreadTitle('😀'.repeat(30))

    expect(Array.from(title)).toHaveLength(21)
    expect(Array.from(title)[0]).toBe('😀')
  })

  it('空白消息回退为默认标题', () => {
    expect(deriveThreadTitle('   ')).toBe('新对话')
  })
})
