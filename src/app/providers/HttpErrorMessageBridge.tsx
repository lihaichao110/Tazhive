import { useEffect } from 'react'
import { App as AntdApp } from 'antd'

import { registerHttpErrorReporter } from '@/shared/api'

// 将 shared 请求层上报的错误桥接为应用级 Ant Design 消息提示。
export function HttpErrorMessageBridge() {
  const { message } = AntdApp.useApp()

  useEffect(
    () =>
      registerHttpErrorReporter((error) => {
        // 相同错误使用稳定 key，避免并发请求产生大量重复提示。
        void message.error({ content: error.message, key: `http-error:${error.message}` })
      }),
    [message],
  )

  return null
}
