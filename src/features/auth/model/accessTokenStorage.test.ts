// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearStoredAccessToken,
  readStoredAccessToken,
  readStoredRefreshToken,
  saveTokenPair,
} from './accessTokenStorage'

describe('accessTokenStorage', () => {
  beforeEach(() => window.localStorage.clear())

  afterEach(() => vi.restoreAllMocks())

  it('保存成对令牌并读取清理过空白的访问令牌', () => {
    saveTokenPair({ access_token: 'access-token', refresh_token: 'refresh-token' })

    expect(readStoredAccessToken()).toBe('access-token')
    expect(readStoredRefreshToken()).toBe('refresh-token')
    window.localStorage.setItem('tazhive:access-token', '  stored-token  ')
    expect(readStoredAccessToken()).toBe('stored-token')
  })

  it('读取空值或受限存储时按未登录处理', () => {
    expect(readStoredAccessToken()).toBeNull()
    expect(readStoredRefreshToken()).toBeNull()
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })

    expect(readStoredAccessToken()).toBeNull()
    expect(readStoredRefreshToken()).toBeNull()
  })

  it('成对清除令牌且不因受限存储阻断注销', () => {
    saveTokenPair({ access_token: 'access-token', refresh_token: 'refresh-token' })
    clearStoredAccessToken()
    expect(readStoredAccessToken()).toBeNull()
    expect(readStoredRefreshToken()).toBeNull()

    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(() => clearStoredAccessToken()).not.toThrow()
  })

  it('访问令牌写入失败时抛出可展示的统一错误', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })

    expect(() =>
      saveTokenPair({ access_token: 'access-token', refresh_token: 'refresh-token' }),
    ).toThrow('无法保存登录状态，请检查浏览器存储设置')
  })
})
