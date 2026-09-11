import { describe, expect, it } from 'vitest'

import { decodeStreamingJsonString } from './decodeStreamingJsonString'

describe('decodeStreamingJsonString', () => {
  it('解码 JSON 简单转义与 Unicode 转义', () => {
    expect(decodeStreamingJsonString('第一行\\n第二行\\t\\"引用\\"\\u3002')).toBe(
      '第一行\n第二行\t"引用"。',
    )
  })

  it.each(['正文\\', '正文\\u', '正文\\u6', '正文\\u68', '正文\\u680'])(
    '暂缓展示不完整的末尾转义：%s',
    (source) => {
      expect(decodeStreamingJsonString(source)).toBe('正文')
    },
  )

  it('转义补齐后只输出一次对应字符', () => {
    expect(decodeStreamingJsonString('路径\\\\')).toBe('路径\\')
    expect(decodeStreamingJsonString('标题\\u6807')).toBe('标题标')
  })

  it('在未转义结束引号处停止且保留正文中的转义引号', () => {
    expect(decodeStreamingJsonString('正文含有 \\"charts\\" 文本","charts":[]')).toBe(
      '正文含有 "charts" 文本',
    )
  })

  it('完整的非法转义按原文保留', () => {
    expect(decodeStreamingJsonString('正文\\q继续')).toBe('正文\\q继续')
  })
})
