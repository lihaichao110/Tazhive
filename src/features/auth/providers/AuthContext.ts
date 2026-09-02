import { createContext } from 'react'

import type { AuthController } from '../model/types'

export const AuthContext = createContext<AuthController | null>(null)
