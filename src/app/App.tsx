import { RouterProvider } from 'react-router/dom'

import { AntdProvider, AppStoreProvider } from './providers'
import { AuthInitializationBoundary } from './providers/AuthInitializationBoundary'
import { appRouter } from './router'

import { AuthProvider } from '@/features/auth'

// 仅装配应用级 Provider，页面与路径配置统一由路由模块管理。
export function App() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <AntdProvider>
          <AuthInitializationBoundary>
            <RouterProvider router={appRouter} />
          </AuthInitializationBoundary>
        </AntdProvider>
      </AppStoreProvider>
    </AuthProvider>
  )
}
