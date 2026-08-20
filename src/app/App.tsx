import { AntdProvider } from './providers'

import { HomePage } from '@/pages/home'

export function App() {
  return (
    <AntdProvider>
      <HomePage />
    </AntdProvider>
  )
}
