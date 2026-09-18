import { HttpError } from '@/shared/api'

import type { TokenPair } from './types'

const ACCESS_TOKEN_STORAGE_KEY = 'tazhive:access-token'
const REFRESH_TOKEN_STORAGE_KEY = 'tazhive:refresh-token'

// 从浏览器持久化存储读取令牌；受限环境下按未登录处理，避免阻断应用启动。
export function readStoredAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

// 读取静默刷新凭据；缺失时视为无法续签，由刷新链路按不可恢复处理。
export function readStoredRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

// 持久化成对令牌；access 写入失败时中止状态切换，避免界面与请求鉴权状态不一致，
// refresh 写入失败仅降级为本次会话内无法静默续签，不得阻断登录。
export function saveTokenPair(tokens: TokenPair): void {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.access_token)
  } catch (error: unknown) {
    throw new HttpError('无法保存登录状态，请检查浏览器存储设置', { cause: error })
  }
  try {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token)
  } catch {
    // 受限存储环境下放弃跨会话续签能力，本次会话仍可正常使用。
  }
}

// 注销时尽力删除持久化令牌；即使浏览器拒绝存储访问，也不能阻断内存状态清理。
export function clearStoredAccessToken(): void {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    // 受限存储环境下保持当前页面为未登录状态，后续启动也会按读取失败处理。
  }
}
