import { describe, expect, it } from 'vitest'

import { parseChatReferences } from './chatReference'

/** 创建覆盖来源协议必要字段的测试数据。 */
function createReference(sourceType: string, documentId: string, chunkIndex: number) {
  return {
    source_type: sourceType,
    title: `${sourceType}-${chunkIndex}`,
    url: `/api/v1/documents/${documentId}/chunks/${chunkIndex}`,
    snippet: `摘要-${chunkIndex}`,
    document_id: documentId,
    chunk_index: chunkIndex,
  }
}

describe('parseChatReferences', () => {
  it('保留 Wiki 与 RAG 来源的原始顺序，并保留同一文档的不同片段', () => {
    const references = [
      createReference('wiki', 'wiki-1', 0),
      createReference('wiki', 'wiki-2', 1),
      createReference('wiki', 'wiki-3', 2),
      createReference('rag', 'rag-1', 198),
      createReference('rag', 'rag-1', 465),
    ]

    expect(parseChatReferences(references)).toEqual(references)
  })

  it('过滤缺少文档定位字段的 Wiki 来源和未知来源类型', () => {
    expect(
      parseChatReferences([
        { ...createReference('wiki', 'wiki-1', 0), document_id: null },
        { ...createReference('wiki', 'wiki-1', 0), chunk_index: null },
        createReference('other', 'other-1', 0),
        createReference('rag', 'rag-1', 1),
      ]),
    ).toEqual([createReference('rag', 'rag-1', 1)])
  })
})
