import type { ChatReference } from './types'

/** 校验单个来源，保证渲染层与请求层只接收可信的结构化字段。 */
export function parseChatReference(value: unknown): ChatReference | null {
  if (typeof value !== 'object' || value === null) return null
  const reference = value as Record<string, unknown>
  const sourceType = reference.source_type
  const isInternalDocument = sourceType === 'rag' || sourceType === 'wiki'
  if (!isInternalDocument && sourceType !== 'web') return null
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
  if (
    isInternalDocument &&
    (typeof reference.document_id !== 'string' || reference.chunk_index === null)
  ) {
    return null
  }

  return {
    source_type: sourceType,
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
