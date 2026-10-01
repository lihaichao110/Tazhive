/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KNOWLEDGE_BASE_BASE_URL?: string
  readonly VITE_DEEPSEEK_MODEL_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
