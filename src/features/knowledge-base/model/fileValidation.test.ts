import { describe, expect, it } from 'vitest'

import { MAX_FILE_SIZE, validateKnowledgeFiles } from './fileValidation'
import type { KnowledgeUploadItem } from './types'

function createFile(name: string, size = 12, lastModified = 1): File {
  const file = new File(['content'], name, { lastModified })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateKnowledgeFiles', () => {
  it('保留支持的文件并拒绝非法格式与超大文件', () => {
    const valid = createFile('manual.PDF')
    const unsupported = createFile('photo.png')
    const oversized = createFile('archive.docx', MAX_FILE_SIZE + 1)

    const result = validateKnowledgeFiles([], [valid, unsupported, oversized])

    expect(result.accepted).toEqual([valid])
    expect(result.rejected).toEqual([
      { fileName: 'photo.png', reason: '暂不支持该文件格式' },
      { fileName: 'archive.docx', reason: '文件大小超过 50MB' },
    ])
  })

  it('按名称、大小、修改时间识别重复文件', () => {
    const existingFile = createFile('guide.md', 20, 99)
    const currentItems: KnowledgeUploadItem[] = [
      { id: 'existing', file: existingFile, progress: 0, status: 'queued' },
    ]

    const result = validateKnowledgeFiles(currentItems, [createFile('guide.md', 20, 99)])

    expect(result.accepted).toHaveLength(0)
    expect(result.rejected[0]?.reason).toBe('文件已在当前队列中')
  })

  it('当前队列达到十个文件后拒绝继续加入', () => {
    const currentItems: KnowledgeUploadItem[] = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      file: createFile(`${index}.txt`, index + 1),
      progress: 0,
      status: 'queued',
    }))

    const result = validateKnowledgeFiles(currentItems, [createFile('extra.txt')])

    expect(result.rejected[0]?.reason).toBe('每批最多上传 10 个文件')
  })
})
