import type { ReactNode } from 'react'
import { ConfigProvider } from 'antd'

interface AntdProviderProps {
  readonly children: ReactNode
}

// 仅配置浅色主题：项目暗色适配依赖 CSS 令牌 prefers-color-scheme，
// antd 暗色算法切换待后续统一接入（当前 Sender 在暗色下沿用浅色表单风格）。
export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          // 与 _tokens.scss 中 --color-accent 浅色值保持一致。
          colorPrimary: '#028550',
          colorBgContainer: '#ffffff',
          borderRadius: 12,
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
