import { Outlet, useNavigation } from 'react-router'

import { PageLoading } from '@/shared/components/PageLoading'

// 承载应用路由出口，并在页面级导航期间统一替换为全屏加载状态。
export function AppRouteOutlet() {
  const navigation = useNavigation()

  return navigation.state === 'loading' ? <PageLoading /> : <Outlet />
}
