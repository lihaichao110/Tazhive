import axios from 'axios'

import type { ChatImageFile } from '../model/types'

import { createHttpClient } from '@/shared/api'

interface UploadResponse {
  readonly object_key: string
  readonly file_url: string
}

const uploadClient = createHttpClient({ timeout: 120_000 })

function getImageType(file: File): string {
  const mimeSubtype = file.type.split('/')[1]?.toLowerCase()
  if (mimeSubtype === 'jpeg') return 'jpg'
  if (mimeSubtype) return mimeSubtype
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

/** 将聊天图片提交到受认证保护的后端接口，并映射为聊天请求使用的图片字段。 */
export async function uploadChatImage(file: File, signal?: AbortSignal): Promise<ChatImageFile> {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await uploadClient.post<UploadResponse>('/api/v1/upload', formData, { signal })
    const objectKey = response.data.object_key
    const fileUrl = response.data.file_url?.trim()
    if (
      typeof objectKey !== 'string' ||
      !objectKey.startsWith('chat-images/') ||
      objectKey.slice('chat-images/'.length).trim() === ''
    ) {
      throw new Error('图片上传成功，但服务端没有返回有效的图片标识。')
    }
    if (!fileUrl) throw new Error('图片上传成功，但服务端没有返回图片链接。')
    return { object_key: objectKey, file_url: fileUrl, file_type: getImageType(file) }
  } catch (error: unknown) {
    if (axios.isCancel(error)) throw new DOMException('图片上传已取消', 'AbortError')
    throw error
  }
}
