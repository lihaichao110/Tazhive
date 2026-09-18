import { afterEach, describe, expect, it } from 'vitest'

import {
  registerAccessTokenProvider,
  registerAccessTokenRejectedHandler,
  registerAccessTokenRefresher,
} from './accessToken'
import { recoverFromAccessTokenRejection } from './recoverRejectedToken'

interface RefreshDeferred {
  promise: Promise<boolean>
  resolve: (value: boolean) => void
}

// 刷新器被调用时才创建的延迟对象，供测试控制在断言时机上完成刷新。
function createDeferred(): RefreshDeferred {
  let resolve!: (value: boolean) => void
  const promise = new Promise<boolean>((resolveDeferred) => {
    resolve = resolveDeferred
  })
  return { promise, resolve }
}

interface AuthRegistryStub {
  currentToken: { value: string | null }
  refreshCount: () => number
  rejectedTokens: string[]
  resolveLastRefresh: (value: boolean) => void
}

const cleanups: Array<() => void> = []

// 为每个用例搭建独立的令牌注册表；用例结束后必须全部注销，避免模块级状态串场。
function setupAuthRegistry(initialToken: string | null): AuthRegistryStub {
  const currentToken = { value: initialToken }
  const createdDeferreds: RefreshDeferred[] = []
  const rejectedTokens: string[] = []
  let refreshCount = 0

  cleanups.push(
    registerAccessTokenProvider(() => currentToken.value),
    registerAccessTokenRefresher(() => {
      refreshCount += 1
      const deferred = createDeferred()
      createdDeferreds.push(deferred)
      return deferred.promise
    }),
    registerAccessTokenRejectedHandler((rejectedToken) => {
      rejectedTokens.push(rejectedToken)
    }),
  )

  return {
    currentToken,
    refreshCount: () => refreshCount,
    rejectedTokens,
    resolveLastRefresh: (value) => {
      const deferred = createdDeferreds[createdDeferreds.length - 1]
      if (deferred) deferred.resolve(value)
    },
  }
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.()
})

describe('recoverFromAccessTokenRejection', () => {
  it('被拒令牌不是当前令牌时直接返回当前令牌，不触发刷新', async () => {
    const registry = setupAuthRegistry('token-new')

    const recovered = await recoverFromAccessTokenRejection('token-old')

    expect(recovered).toBe('token-new')
    expect(registry.refreshCount()).toBe(0)
  })

  it('当前令牌被拒时单飞刷新，并发请求共享同一次刷新', async () => {
    const registry = setupAuthRegistry('token-a')
    const first = recoverFromAccessTokenRejection('token-a')
    const second = recoverFromAccessTokenRejection('token-a')

    registry.currentToken.value = 'token-b'
    registry.resolveLastRefresh(true)

    expect(await first).toBe('token-b')
    expect(await second).toBe('token-b')
    expect(registry.refreshCount()).toBe(1)
  })

  it('刷新失败时上报被拒令牌并返回 null', async () => {
    const registry = setupAuthRegistry('token-a')
    const pending = recoverFromAccessTokenRejection('token-a')

    registry.resolveLastRefresh(false)

    expect(await pending).toBeNull()
    expect(registry.rejectedTokens).toEqual(['token-a'])
  })

  it('刷新失败但期间已重新登录时保留新会话，不误清令牌', async () => {
    const registry = setupAuthRegistry('token-a')
    const pending = recoverFromAccessTokenRejection('token-a')

    registry.currentToken.value = 'token-fresh-login'
    registry.resolveLastRefresh(false)

    expect(await pending).toBe('token-fresh-login')
    expect(registry.rejectedTokens).toHaveLength(0)
  })

  it('当前无令牌（会话已清理）时直接返回 null，不再触发刷新', async () => {
    const registry = setupAuthRegistry(null)

    const recovered = await recoverFromAccessTokenRejection('token-a')

    expect(recovered).toBeNull()
    expect(registry.refreshCount()).toBe(0)
  })
})
