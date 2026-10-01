export const DEFAULT_DEEPSEEK_MODEL_NAME = 'deepseek-v4-flash'

// 模型名称属于可公开的前端构建配置；未配置或仅含空白时使用稳定默认值。
export function readDeepSeekModelName(): string {
  return import.meta.env.VITE_DEEPSEEK_MODEL_NAME?.trim() || DEFAULT_DEEPSEEK_MODEL_NAME
}
