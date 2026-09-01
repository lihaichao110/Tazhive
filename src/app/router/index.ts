import { createBrowserRouter, redirect, type RouteObject } from 'react-router'

import { AppRouteOutlet } from './AppRouteOutlet'

import { PageLoading } from '@/shared/components/PageLoading'
import { APP_ROUTES } from '@/shared/config'

const APP_ROUTE_CONFIG = [
  {
    id: 'root',
    Component: AppRouteOutlet,
    HydrateFallback: PageLoading,
    children: [
      {
        index: true,
        lazy: {
          Component: async () => (await import('@/pages/home')).HomePage,
        },
      },
      {
        path: APP_ROUTES.mermaidPreview,
        lazy: {
          Component: async () => (await import('@/pages/mermaid-preview')).MermaidPreviewPage,
        },
      },
      {
        path: '*',
        loader: () => redirect(APP_ROUTES.home),
      },
    ],
  },
] satisfies RouteObject[]

// 路由单例在 React 树外创建，避免渲染期间重复初始化并集中管理页面级分包。
export const appRouter = createBrowserRouter(APP_ROUTE_CONFIG)
