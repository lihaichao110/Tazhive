import { RouterProvider } from 'react-router/dom'

import { AntdProvider, AppStoreProvider } from './providers'
import { appRouter } from './router'

// 仅装配应用级 Provider，页面与路径配置统一由路由模块管理。
export function App() {
  return (
    <AppStoreProvider>
      <AntdProvider>
        <RouterProvider router={appRouter} />
      </AntdProvider>
    </AppStoreProvider>
  )
}
