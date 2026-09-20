import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sources, type SourcesProps } from '@ant-design/x'
import { Alert, Button, Drawer, Spin } from 'antd'
import { FileText, Globe2 } from 'lucide-react'

import { requestDocumentChunk, type DocumentChunkRead } from '../../api/getDocumentChunk'
import type { ChatReference } from '../../model/types'
import styles from './MessageSources.module.scss'

interface MessageSourcesProps {
  readonly references: readonly ChatReference[]
}

interface SourceEntry {
  readonly key: string
  readonly reference: ChatReference
}

type SourcesItem = NonNullable<SourcesProps['items']>[number]

function sourceKey(reference: ChatReference, index: number): string {
  return reference.source_type === 'rag'
    ? `rag:${reference.document_id}:${reference.chunk_index}:${index}`
    : `web:${reference.url}:${index}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : '文档片段加载失败，请稍后重试。'
}

/** 展示回答来源，并在受控 Drawer 中按需加载受鉴权保护的 RAG 文档片段。 */
export function MessageSources({ references }: MessageSourcesProps) {
  const [activeEntry, setActiveEntry] = useState<SourceEntry | null>(null)
  const [chunk, setChunk] = useState<DocumentChunkRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)

  const entries = useMemo(
    () => references.map((reference, index) => ({ key: sourceKey(reference, index), reference })),
    [references],
  )
  const entryByKey = useMemo(() => new Map(entries.map((entry) => [entry.key, entry])), [entries])

  const activateEntry = useCallback((entry: SourceEntry): void => {
    if (entry.reference.source_type === 'web') {
      window.open(entry.reference.url, '_blank', 'noopener,noreferrer')
      return
    }
    setChunk(null)
    setError(null)
    setActiveEntry(entry)
  }, [])

  const items = useMemo<SourcesItem[]>(
    () =>
      entries.map((entry) => ({
        key: entry.key,
        title: (
          <button
            type="button"
            className={styles.sourceButton}
            aria-label={`打开来源：${entry.reference.title}`}
            onClick={(event) => {
              event.stopPropagation()
              activateEntry(entry)
            }}
          >
            {entry.reference.title}
          </button>
        ),
        description: entry.reference.snippet,
        icon:
          entry.reference.source_type === 'rag' ? (
            <FileText size={15} aria-hidden="true" />
          ) : (
            <Globe2 size={15} aria-hidden="true" />
          ),
        url: entry.reference.source_type === 'web' ? entry.reference.url : undefined,
      })),
    [activateEntry, entries],
  )

  const handleSourceClick = useCallback(
    (item: SourcesItem): void => {
      const entry = entryByKey.get(String(item.key))
      if (entry?.reference.source_type === 'rag') activateEntry(entry)
    },
    [activateEntry, entryByKey],
  )

  useEffect(() => {
    const reference = activeEntry?.reference
    if (!reference || reference.source_type !== 'rag') return
    const controller = new AbortController()
    setLoading(true)
    setChunk(null)
    setError(null)
    if (reference.document_id === null || reference.chunk_index === null) return
    void requestDocumentChunk(reference.document_id, reference.chunk_index, controller.signal)
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
  }, [activeEntry, retryVersion])

  const closeDrawer = useCallback((): void => {
    setActiveEntry(null)
    setChunk(null)
    setError(null)
  }, [])

  if (references.length === 0) return null

  return (
    <div className={styles.root} aria-label="回答来源">
      <Sources
        inline
        title={`引用来源数量 ${references.length}条`}
        items={items}
        onClick={handleSourceClick}
      />
      <Drawer
        open={activeEntry !== null}
        title={chunk?.filename ?? activeEntry?.reference.title ?? '文档来源'}
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
