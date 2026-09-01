const STORAGE_PREFIX = 'tazhive:mermaid-preview:'

interface MermaidPreviewRecord {
  readonly source: string
}

function createPreviewId(): string {
  return crypto.randomUUID()
}

function getStorageKey(previewId: string): string {
  return `${STORAGE_PREFIX}${previewId}`
}

// 创建会话级 Mermaid 预览记录；浏览器禁用存储时仍返回可用于路由状态的 ID。
export function createMermaidPreview(source: string): string {
  const previewId = createPreviewId()

  try {
    const record: MermaidPreviewRecord = { source }
    window.sessionStorage.setItem(getStorageKey(previewId), JSON.stringify(record))
  } catch {
    // 隐私模式、存储配额或安全策略可能禁用 sessionStorage，调用方会使用路由状态兜底。
  }

  return previewId
}

// 读取并校验会话预览数据，损坏或不可访问的记录统一视为不存在。
export function readMermaidPreview(previewId: string): string | null {
  try {
    const serialized = window.sessionStorage.getItem(getStorageKey(previewId))
    if (!serialized) return null

    const record: unknown = JSON.parse(serialized)
    if (
      typeof record !== 'object' ||
      record === null ||
      !('source' in record) ||
      typeof record.source !== 'string'
    ) {
      return null
    }

    return record.source
  } catch {
    return null
  }
}
