import type { FileValidationResult, KnowledgeUploadItem } from './types'

export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const MAX_FILE_COUNT = 10

export const ACCEPTED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
] as const

export const FILE_ACCEPT_VALUE = ACCEPTED_FILE_EXTENSIONS.join(',')

function getFileExtension(fileName: string): string {
  const extensionIndex = fileName.lastIndexOf('.')
  return extensionIndex < 0 ? '' : fileName.slice(extensionIndex).toLowerCase()
}

function getFileSignature(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

// 对新选择的文件执行统一校验，并保留合法文件原有顺序。
export function validateKnowledgeFiles(
  currentItems: readonly KnowledgeUploadItem[],
  selectedFiles: readonly File[],
): FileValidationResult {
  const accepted: File[] = []
  const rejected: FileValidationResult['rejected'][number][] = []
  const signatures = new Set(currentItems.map((item) => getFileSignature(item.file)))
  let availableSlots = Math.max(0, MAX_FILE_COUNT - currentItems.length)

  selectedFiles.forEach((file) => {
    const extension = getFileExtension(file.name)
    const signature = getFileSignature(file)
    let reason = ''

    if (
      !ACCEPTED_FILE_EXTENSIONS.includes(extension as (typeof ACCEPTED_FILE_EXTENSIONS)[number])
    ) {
      reason = '暂不支持该文件格式'
    } else if (file.size > MAX_FILE_SIZE) {
      reason = '文件大小超过 50MB'
    } else if (signatures.has(signature)) {
      reason = '文件已在当前队列中'
    } else if (availableSlots === 0) {
      reason = '每批最多上传 10 个文件'
    }

    if (reason) {
      rejected.push({ fileName: file.name, reason })
      return
    }

    accepted.push(file)
    signatures.add(signature)
    availableSlots -= 1
  })

  return { accepted, rejected }
}
