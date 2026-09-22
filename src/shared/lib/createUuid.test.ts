import { afterEach, describe, expect, it, vi } from 'vitest'

import { createUuid } from './createUuid'

const NATIVE_UUID = '11111111-1111-4111-8111-111111111111'

describe('createUuid', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('优先使用浏览器原生 randomUUID', () => {
    const randomUUID = vi.fn(() => NATIVE_UUID)
    const getRandomValues = vi.fn()
    vi.stubGlobal('crypto', { randomUUID, getRandomValues })

    expect(createUuid()).toBe(NATIVE_UUID)
    expect(randomUUID).toHaveBeenCalledTimes(1)
    expect(getRandomValues).not.toHaveBeenCalled()
  })

  it('缺少 randomUUID 时使用安全随机数生成 UUID v4', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index))
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })

    const uuid = createUuid()

    expect(uuid).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('安全随机数能力完全不可用时明确失败', () => {
    vi.stubGlobal('crypto', {})

    expect(() => createUuid()).toThrow('当前浏览器不支持安全随机数生成')
  })
})
