// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearStoredAccessToken,
  readStoredAccessToken,
  saveAccessToken,
} from './accessTokenStorage'

describe('accessTokenStorage', () => {
  beforeEach(() => window.localStorage.clear())

  afterEach(() => vi.restoreAllMocks())

  it('保存并读取清理过空白的访问令牌', () => {
    saveAccessToken('access-token')

    expect(readStoredAccessToken()).toBe('access-token')
    window.localStorage.setItem('tazhive:access-token', '  stored-token  ')
    expect(readStoredAccessToken()).toBe('stored-token')
  })

  it('读取空值或受限存储时按未登录处理', () => {
    expect(readStoredAccessToken()).toBeNull()
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })

    expect(readStoredAccessToken()).toBeNull()
  })

  it('清除令牌且不因受限存储阻断注销', () => {
    saveAccessToken('access-token')
    clearStoredAccessToken()
    expect(readStoredAccessToken()).toBeNull()

    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(() => clearStoredAccessToken()).not.toThrow()
  })

  it('存储写入失败时抛出可展示的统一错误', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })

    expect(() => saveAccessToken('access-token')).toThrow('无法保存登录状态，请检查浏览器存储设置')
  })
})
