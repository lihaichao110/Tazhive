import { useContext } from 'react'

import { DynamicCardHostContext, type DynamicCardReadyHandler } from './DynamicCardHostContext'

// 读取最近的动态卡片宿主；卡片离开页面宿主时应立即暴露装配错误。
export function useDynamicCardHost(): DynamicCardReadyHandler {
  const onReady = useContext(DynamicCardHostContext)
  if (!onReady) throw new Error('useDynamicCardHost 必须在 DynamicCardHostProvider 内使用。')
  return onReady
}
