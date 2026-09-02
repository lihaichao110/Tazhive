import { useContext } from 'react'

import { AuthContext } from './AuthContext'

import type { AuthController } from '../model/types'

// 读取当前应用级认证能力，仅允许在 AuthProvider 子树中调用。
export function useAuth(): AuthController {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return context
}
