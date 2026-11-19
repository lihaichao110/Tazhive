import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Sender } from '@ant-design/x'
import type { SenderRef } from '@ant-design/x/es/sender'
import type { ActionsComponents } from '@ant-design/x/es/sender/interface'
import { X } from 'lucide-react'

import styles from './ChatComposer.module.scss'
import { ChatComposerFooter } from './ChatComposerFooter'
import { ChatImagePreview, type SelectedChatImage } from './ChatImagePreview'

import { uploadChatImage } from '../../api/uploadChatImage'
import { useChatSession } from '../../providers/useChatSession'

// 单条消息的图片数量限制。
const MAX_CHAT_IMAGES = 3
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

interface ComposerFooterRenderInfo {
  readonly components: ActionsComponents
}

// 粗指针设备通常由触屏操作，发送成功后应释放输入焦点以收起软键盘。
function isMobileLikeDevice(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

// 管理文字草稿和本地图片生命周期；请求与会话状态交给业务 Hook。
export function ChatComposer() {
  const { abort, clearQuote, isReplying, quote, sendMessage } = useChatSession()
  const senderRef = useRef<SenderRef>(null)
  const objectUrlsRef = useRef(new Set<string>())
  const uploadControllersRef = useRef(new Map<string, AbortController>())
  const nextImageIdRef = useRef(0)
  const isSubmittingRef = useRef(false)
  const [value, setValue] = useState('')
  const [images, setImages] = useState<SelectedChatImage[]>([])
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasUploadingImages = images.some((image) => image.status === 'uploading')
  const hasFailedImages = images.some((image) => image.status === 'error')
  const sendDisabled = isReplying || isSubmitting || hasUploadingImages || hasFailedImages

  // 组件卸载时取消尚未完成的图床请求，并释放预览 URL。
  useEffect(
    () => () => {
      uploadControllersRef.current.forEach((controller) => controller.abort())
      uploadControllersRef.current.clear()
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrlsRef.current.clear()
    },
    [],
  )

  // 每张图片独立上传；失败状态留在预览卡片上，可单独重试或移除。
  const uploadImage = useCallback(async (id: string, file: File): Promise<void> => {
    const controller = new AbortController()
    uploadControllersRef.current.set(id, controller)
    try {
      const uploadedImage = await uploadChatImage(file, controller.signal)
      setImages((current) =>
        current.map((image) =>
          image.id === id
            ? { ...image, status: 'uploaded', uploadedImage, uploadError: undefined }
            : image,
        ),
      )
    } catch (error) {
      if (controller.signal.aborted) return
      setImages((current) =>
        current.map((image) =>
          image.id === id
            ? {
                ...image,
                status: 'error',
                uploadError: error instanceof Error ? error.message : '图片上传失败，请重试。',
              }
            : image,
        ),
      )
    } finally {
      if (uploadControllersRef.current.get(id) === controller) {
        uploadControllersRef.current.delete(id)
      }
    }
  }, [])

  const removeImage = useCallback(
    (id: string): void => {
      const removed = images.find((image) => image.id === id)
      uploadControllersRef.current.get(id)?.abort()
      uploadControllersRef.current.delete(id)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
        objectUrlsRef.current.delete(removed.previewUrl)
      }
      setImages(images.filter((image) => image.id !== id))
      setAttachmentNotice(null)
    },
    [images],
  )

  const handleFilesSelected = useCallback(
    (files: readonly File[]): void => {
      const imageFiles = files.filter((file) => SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase()))
      const remaining = MAX_CHAT_IMAGES - images.length
      const acceptedFiles = imageFiles.slice(0, Math.max(remaining, 0))
      const nextImages = acceptedFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file)
        objectUrlsRef.current.add(previewUrl)
        nextImageIdRef.current += 1
        return {
          id: String(nextImageIdRef.current),
          file,
          previewUrl,
          status: 'uploading' as const,
        }
      })
      if (nextImages.length > 0) setImages((current) => [...current, ...nextImages])
      // 选择完成后立即并发上传；请求使用服务端 key，预览继续使用返回的 URL。
      nextImages.forEach((image) => void uploadImage(image.id, image.file))

      if (imageFiles.length !== files.length) {
        setAttachmentNotice('仅支持 JPEG、PNG、GIF 或 WebP 图片。')
      } else if (imageFiles.length > acceptedFiles.length) {
        setAttachmentNotice(`每条消息最多添加 ${MAX_CHAT_IMAGES} 张图片。`)
      } else if (nextImages.length > 0) setAttachmentNotice(null)
    },
    [images.length, uploadImage],
  )

  const retryImage = useCallback(
    (id: string): void => {
      const image = images.find((item) => item.id === id)
      if (!image || image.status !== 'error') return
      setImages((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: 'uploading', uploadError: undefined } : item,
        ),
      )
      setAttachmentNotice(null)
      void uploadImage(image.id, image.file)
    },
    [images, uploadImage],
  )

  const renderFooter = useCallback(
    (_actionNode: ReactNode, { components }: ComposerFooterRenderInfo) => {
      const actionNode = (
        <div className={styles.senderActions}>
          <components.SpeechButton />
          {isReplying ? (
            <components.LoadingButton />
          ) : (
            <components.SendButton disabled={sendDisabled || !value.trim()} />
          )}
        </div>
      )

      return (
        <ChatComposerFooter
          actionNode={actionNode}
          attachmentNotice={attachmentNotice}
          attachmentDisabled={isReplying || isSubmitting}
          onFilesSelected={handleFilesSelected}
        />
      )
    },
    [attachmentNotice, handleFilesSelected, isReplying, isSubmitting, sendDisabled, value],
  )

  const handleSubmit = useCallback(
    (content: string) => {
      const prompt = content.trim()
      // 图片随消息发送仍要求填写文字，避免空 prompt 触发后端不支持的请求。
      if (!prompt || isSubmittingRef.current) return
      if (hasUploadingImages) {
        setAttachmentNotice('图片仍在上传，请稍候再发送。')
        return
      }
      if (hasFailedImages) {
        setAttachmentNotice('请重试或移除上传失败的图片。')
        return
      }

      const files = images.flatMap((image) => (image.uploadedImage ? [image.uploadedImage] : []))
      if (files.length !== images.length) return

      isSubmittingRef.current = true
      setIsSubmitting(true)
      setAttachmentNotice(null)

      // 上传已在选择后完成；聊天请求失败时保留图片 key、URL 和草稿供用户重试。
      void (async () => {
        try {
          const accepted = await (files.length > 0
            ? sendMessage(prompt, files)
            : sendMessage(prompt))
          if (!accepted) return
          if (isMobileLikeDevice()) senderRef.current?.blur()
          senderRef.current?.clear()
          setValue('')
          setImages([])
          uploadControllersRef.current.clear()
          objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
          objectUrlsRef.current.clear()
          setAttachmentNotice(null)
        } catch (error) {
          setAttachmentNotice(error instanceof Error ? error.message : '图片处理失败，请重试。')
        } finally {
          isSubmittingRef.current = false
          setIsSubmitting(false)
        }
      })()
    },
    [hasFailedImages, hasUploadingImages, images, sendMessage],
  )

  const quoteSource = quote?.role === 'assistant' ? '引用 AI 回答' : '引用你的问题'
  const quoteHeader = (
    <Sender.Header
      open={Boolean(quote)}
      closable={false}
      className={styles.quoteHeader}
      classNames={{ header: styles.quoteHeaderTitle, content: styles.quoteHeaderContent }}
      title={
        <div className={styles.quoteTitleRow}>
          <span>{quoteSource}</span>
          <button
            type="button"
            className={styles.quoteClose}
            aria-label="移除引用"
            onClick={clearQuote}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      }
    >
      <p className={styles.quoteText}>{quote?.text ?? ''}</p>
    </Sender.Header>
  )

  return (
    <Sender
      ref={senderRef}
      value={value}
      onChange={(nextValue) => setValue(nextValue)}
      onSubmit={handleSubmit}
      onCancel={abort}
      loading={isReplying}
      allowSpeech
      placeholder="发消息..."
      autoSize={{ minRows: 1, maxRows: 8 }}
      // 输入区独占一行全宽，工具按钮与发送操作统一放在 footer。
      suffix={false}
      footer={renderFooter}
      header={
        <>
          {quoteHeader}
          <ChatImagePreview images={images} onRemove={removeImage} onRetry={retryImage} />
        </>
      }
      classNames={{ root: styles.sender }}
    />
  )
}
