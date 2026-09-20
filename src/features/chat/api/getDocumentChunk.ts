import { createHttpClient } from '@/shared/api'

/** RAG 来源详情接口返回的完整文档片段。 */
export interface DocumentChunkRead {
  readonly document_id: string
  readonly filename: string
  readonly file_type: string
  readonly chunk_index: number
  readonly content: string
}

const chatClient = createHttpClient()

function isDocumentChunkRead(value: unknown): value is DocumentChunkRead {
  if (typeof value !== 'object' || value === null) return false
  const chunk = value as Record<string, unknown>
  return (
    typeof chunk.document_id === 'string' &&
    typeof chunk.filename === 'string' &&
    typeof chunk.file_type === 'string' &&
    Number.isInteger(chunk.chunk_index) &&
    typeof chunk.content === 'string'
  )
}

/** 使用受信任的文档标识构造鉴权请求地址，不消费后端来源中的任意 URL。 */
export async function requestDocumentChunk(
  documentId: string,
  chunkIndex: number,
  signal?: AbortSignal,
): Promise<DocumentChunkRead> {
  const path = `/api/v1/documents/${encodeURIComponent(documentId)}/chunks/${chunkIndex}`
  const response = await chatClient.get<unknown>(path, { signal })
  if (!isDocumentChunkRead(response.data)) throw new Error('文档片段响应格式不正确')
  return response.data
}
