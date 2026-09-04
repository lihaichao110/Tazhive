import { HttpError } from '@/shared/api'

const ACCESS_TOKEN_STORAGE_KEY = 'tazhive:access-token'

// 从浏览器持久化存储读取令牌；受限环境下按未登录处理，避免阻断应用启动。
export function readStoredAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

// 持久化非空令牌；写入失败时中止登录状态切换，避免界面与请求鉴权状态不一致。
export function saveAccessToken(accessToken: string): void {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
  } catch (error: unknown) {
    throw new HttpError('无法保存登录状态，请检查浏览器存储设置', { cause: error })
  }
}

// 注销时尽力删除持久化令牌；即使浏览器拒绝存储访问，也不能阻断内存状态清理。
export function clearStoredAccessToken(): void {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    // 受限存储环境下保持当前页面为未登录状态，后续启动也会按读取失败处理。
  }
}
