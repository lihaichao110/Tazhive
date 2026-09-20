import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestDocumentChunk } from './getDocumentChunk'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/shared/api', () => ({ createHttpClient: () => ({ get }) }))

describe('requestDocumentChunk', () => {
  beforeEach(() => get.mockReset())

  it('使用编码后的可信字段请求文档片段并透传取消信号', async () => {
    const chunk = {
      document_id: 'doc/1',
      filename: '员工手册.pdf',
      file_type: 'pdf',
      chunk_index: 3,
      content: '完整片段',
    }
    const controller = new AbortController()
    get.mockResolvedValue({ data: chunk })

    await expect(requestDocumentChunk('doc/1', 3, controller.signal)).resolves.toEqual(chunk)
    expect(get).toHaveBeenCalledWith('/api/v1/documents/doc%2F1/chunks/3', {
      signal: controller.signal,
    })
  })

  it('拒绝结构非法的详情响应', async () => {
    get.mockResolvedValue({ data: { content: '缺少字段' } })
    await expect(requestDocumentChunk('doc-1', 1)).rejects.toThrow('文档片段响应格式不正确')
  })
})
