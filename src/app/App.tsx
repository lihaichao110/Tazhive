import { AntdProvider, AppStoreProvider } from './providers'

import { HomePage } from '@/pages/home'

export function App() {
  return (
    <AppStoreProvider>
      <AntdProvider>
        <HomePage />
      </AntdProvider>
    </AppStoreProvider>
  )
}
