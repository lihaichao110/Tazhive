import type { ChatReference } from './types'

/** 校验单个来源，保证渲染层与请求层只接收可信的结构化字段。 */
export function parseChatReference(value: unknown): ChatReference | null {
  if (typeof value !== 'object' || value === null) return null
  const reference = value as Record<string, unknown>
  const isRag = reference.source_type === 'rag'
  const isWeb = reference.source_type === 'web'
  if (!isRag && !isWeb) return null
  if (
    typeof reference.title !== 'string' ||
    typeof reference.url !== 'string' ||
    typeof reference.snippet !== 'string'
  ) {
    return null
  }
  if (reference.document_id !== null && typeof reference.document_id !== 'string') {
    return null
  }
  if (
    reference.chunk_index !== null &&
    (!Number.isInteger(reference.chunk_index) || Number(reference.chunk_index) < 0)
  ) {
    return null
  }
  if (isRag && (typeof reference.document_id !== 'string' || reference.chunk_index === null)) {
    return null
  }

  return {
    source_type: isRag ? 'rag' : 'web',
    title: reference.title,
    url: reference.url,
    snippet: reference.snippet,
    document_id: reference.document_id,
    chunk_index: reference.chunk_index as number | null,
  }
}

/** 从数组中滤除非法来源；非数组返回 null，供调用方区分缺失与明确空数组。 */
export function parseChatReferences(value: unknown): readonly ChatReference[] | null {
  if (!Array.isArray(value)) return null
  return value.flatMap((item) => {
    const reference = parseChatReference(item)
    return reference ? [reference] : []
  })
}
