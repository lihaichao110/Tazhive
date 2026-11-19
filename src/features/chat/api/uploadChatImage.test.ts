import axios, { type AxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { createHttpClient, post } = vi.hoisted(() => {
  const mockedPost = vi.fn()
  return {
    createHttpClient: vi.fn(() => ({ post: mockedPost })),
    post: mockedPost,
  }
})

vi.mock('@/shared/api', () => ({ createHttpClient }))

import { uploadChatImage } from './uploadChatImage'

function getRequestConfig(): AxiosRequestConfig {
  const config: unknown = post.mock.calls[0]?.[2]
  if (typeof config !== 'object' || config === null) throw new Error('未捕获上传配置')
  return config as AxiosRequestConfig
}

describe('uploadChatImage', () => {
  afterEach(() => post.mockReset())

  it('使用统一鉴权客户端提交 multipart 图片并映射 OSS 地址', async () => {
    const uploadedFile = new File(['image'], 'photo.jpeg', { type: 'image/jpeg' })
    post.mockResolvedValueOnce({
      data: {
        object_key: 'chat-images/photo.jpg',
        file_url: 'https://images.example.com/photo.jpg',
      },
    })

    await expect(uploadChatImage(uploadedFile)).resolves.toEqual({
      object_key: 'chat-images/photo.jpg',
      file_url: 'https://images.example.com/photo.jpg',
      file_type: 'jpg',
    })
    expect(createHttpClient).toHaveBeenCalledWith({ timeout: 120_000 })
    expect(post).toHaveBeenCalledWith(
      '/api/v1/upload',
      expect.any(FormData),
      expect.objectContaining({ signal: undefined }),
    )
    const formData: unknown = post.mock.calls[0]?.[1]
    expect(formData).toBeInstanceOf(FormData)
    if (!(formData instanceof FormData)) throw new Error('上传内容不是 FormData')
    expect(formData.get('file')).toBe(uploadedFile)
  })

  it('服务端没有返回图片 URL 时抛出清晰错误', async () => {
    post.mockResolvedValueOnce({
      data: { object_key: 'chat-images/photo.png', file_url: '  ' },
    })

    await expect(
      uploadChatImage(new File(['image'], 'photo.png', { type: 'image/png' })),
    ).rejects.toThrow('图片上传成功，但服务端没有返回图片链接。')
  })

  it('服务端没有返回合法的 chat-images key 时抛出清晰错误', async () => {
    post.mockResolvedValueOnce({
      data: { object_key: 'other/photo.png', file_url: 'https://images.example.com/photo.png' },
    })

    await expect(
      uploadChatImage(new File(['image'], 'photo.png', { type: 'image/png' })),
    ).rejects.toThrow('图片上传成功，但服务端没有返回有效的图片标识。')
  })

  it('服务端缺少 object_key 时阻止后续聊天请求所需的映射', async () => {
    post.mockResolvedValueOnce({
      data: { file_url: 'https://images.example.com/photo.png' },
    })

    await expect(
      uploadChatImage(new File(['image'], 'photo.png', { type: 'image/png' })),
    ).rejects.toThrow('图片上传成功，但服务端没有返回有效的图片标识。')
  })

  it('将 Axios 取消转换为上传流程识别的 AbortError', async () => {
    post.mockRejectedValueOnce(new axios.CanceledError())
    const controller = new AbortController()

    await expect(
      uploadChatImage(new File(['image'], 'photo.png', { type: 'image/png' }), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(getRequestConfig().signal).toBe(controller.signal)
  })
})
