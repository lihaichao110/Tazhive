import { describe, expect, it } from 'vitest'

import { calculateDynamicCardScroll } from './dynamicCardScroll'

describe('calculateDynamicCardScroll', () => {
  it('将卡片顶部定位到滚动区域顶部下方 24px', () => {
    expect(
      calculateDynamicCardScroll({
        areaTop: 80,
        cardTop: 320,
        clientHeight: 600,
        currentScrollTop: 100,
        scrollHeight: 1_200,
        topOffset: 24,
      }),
    ).toEqual({ targetTop: 316, reserveHeight: 0 })
  })

  it('消息末尾空间不足时只补充达到目标位置所需的高度', () => {
    expect(
      calculateDynamicCardScroll({
        areaTop: 80,
        cardTop: 680,
        clientHeight: 600,
        currentScrollTop: 200,
        scrollHeight: 900,
        topOffset: 24,
      }),
    ).toEqual({ targetTop: 776, reserveHeight: 476 })
  })
})
