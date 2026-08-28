import type { ReactNode } from 'react'

import { DynamicCardHostContext, type DynamicCardReadyHandler } from './DynamicCardHostContext'

interface DynamicCardHostProviderProps {
  readonly children: ReactNode
  readonly onReady: DynamicCardReadyHandler
}

// 将页面拥有的动态卡片定位能力注入最小消息子树，不泄漏页面实现到 feature。
export function DynamicCardHostProvider({ children, onReady }: DynamicCardHostProviderProps) {
  return (
    <DynamicCardHostContext.Provider value={onReady}>{children}</DynamicCardHostContext.Provider>
  )
}
