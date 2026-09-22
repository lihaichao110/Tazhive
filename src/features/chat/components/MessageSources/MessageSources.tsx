import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Drawer, Popover, Spin } from 'antd'

import { requestDocumentChunk, type DocumentChunkRead } from '../../api/getDocumentChunk'
import type { ChatReference } from '../../model/types'
import { SourcePopoverContent } from './SourcePopoverContent'
import styles from './MessageSources.module.scss'

interface MessageSourcesProps {
  readonly references: readonly ChatReference[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : '文档片段加载失败，请稍后重试。'
}

/** 展示回答来源，并在受控 Drawer 中按需加载受鉴权保护的内部文档片段。 */
export function MessageSources({ references }: MessageSourcesProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [activeReference, setActiveReference] = useState<ChatReference | null>(null)
  const [chunk, setChunk] = useState<DocumentChunkRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)

  const activateReference = useCallback((reference: ChatReference): void => {
    // 先关闭受控浮层，再执行来源动作，避免 Popover 与 Drawer 同时停留在页面上。
    setSourcesOpen(false)
    if (reference.source_type === 'web') {
      window.open(reference.url, '_blank', 'noopener,noreferrer')
      return
    }
    setChunk(null)
    setError(null)
    setActiveReference(reference)
  }, [])

  useEffect(() => {
    if (!activeReference || activeReference.source_type === 'web') return
    const controller = new AbortController()
    setLoading(true)
    setChunk(null)
    setError(null)
    if (activeReference.document_id === null || activeReference.chunk_index === null) return
    void requestDocumentChunk(
      activeReference.document_id,
      activeReference.chunk_index,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setChunk(result)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [activeReference, retryVersion])

  const closeDrawer = useCallback((): void => {
    setActiveReference(null)
    setChunk(null)
    setError(null)
  }, [])

  if (references.length === 0) return null

  return (
    <div className={styles.root} aria-label="回答来源">
      <Popover
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        // 仅保留点击触发，避免鼠标移入先打开、同一次点击又立即关闭的事件竞争。
        trigger="click"
        placement="top"
        destroyOnHidden
        styles={{ container: { width: 300 } }}
        content={<SourcePopoverContent references={references} onSelect={activateReference} />}
      >
        <button
          type="button"
          className={styles.sourceTrigger}
          aria-label={`查看 ${references.length} 条引用来源`}
          aria-expanded={sourcesOpen}
        >
          引用来源数量 {references.length}条
        </button>
      </Popover>
      <Drawer
        open={activeReference !== null}
        title={chunk?.filename ?? activeReference?.title ?? '文档来源'}
        aria-label="文档来源详情"
        onClose={closeDrawer}
      >
        {loading ? (
          <div className={styles.loading} role="status" aria-label="正在加载文档片段">
            <Spin />
            <span>正在加载文档片段…</span>
          </div>
        ) : null}
        {error ? (
          <Alert
            type="error"
            showIcon
            message="文档片段加载失败"
            description={error}
            action={
              <Button
                type="primary"
                aria-label="重试加载文档片段"
                onClick={() => setRetryVersion((version) => version + 1)}
              >
                重试
              </Button>
            }
          />
        ) : null}
        {chunk ? <pre className={styles.content}>{chunk.content}</pre> : null}
      </Drawer>
    </div>
  )
}
