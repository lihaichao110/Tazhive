export interface DeepSeekConfig {
  readonly apiKey: string
  readonly baseUrl: string
  readonly modelName: string
}

export type DeepSeekConfigResult =
  | { readonly config: DeepSeekConfig; readonly error: null }
  | { readonly config: null; readonly error: string }

const ENV_LABELS = {
  VITE_DEEPSEEK_API_KEY: 'API Key',
  VITE_DEEPSEEK_BASE_URL: 'Base URL',
  VITE_DEEPSEEK_MODEL_NAME: '模型名称',
} as const

// 校验协议并移除尾斜杠，确保请求层可以稳定拼接具体 API 路径。
function normalizeBaseUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

// 集中读取并校验 DeepSeek 环境变量，调用方只需处理成功配置或可展示错误。
export function readDeepSeekConfig(): DeepSeekConfigResult {
  const values = {
    VITE_DEEPSEEK_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY?.trim(),
    VITE_DEEPSEEK_BASE_URL: import.meta.env.VITE_DEEPSEEK_BASE_URL?.trim(),
    VITE_DEEPSEEK_MODEL_NAME: import.meta.env.VITE_DEEPSEEK_MODEL_NAME?.trim(),
  }
  const missingLabels = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => ENV_LABELS[key as keyof typeof ENV_LABELS])

  if (missingLabels.length > 0) {
    // 一次列出全部缺失项，避免用户逐项修复后反复启动应用排查。
    return {
      config: null,
      error: `缺少 DeepSeek 配置：${missingLabels.join('、')}。请检查 .env.local。`,
    }
  }

  const baseUrl = normalizeBaseUrl(values.VITE_DEEPSEEK_BASE_URL ?? '')
  if (!baseUrl) {
    return { config: null, error: 'DeepSeek Base URL 必须是有效的 HTTP 或 HTTPS 地址。' }
  }

  return {
    config: {
      apiKey: values.VITE_DEEPSEEK_API_KEY ?? '',
      baseUrl,
      modelName: values.VITE_DEEPSEEK_MODEL_NAME ?? '',
    },
    error: null,
  }
}
