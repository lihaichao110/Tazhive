import { useCallback, useEffect, useRef, useState } from 'react'
import { CodeHighlighter } from '@ant-design/x'
import { ArrowLeft, Download, Share2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'

import styles from './MermaidPreviewPage.module.scss'
import { getMermaidImageErrorMessage } from './mermaidImageError'
import { createMermaidPng, saveMermaidPng } from './mermaidImageExport'

import { MermaidDiagram, readMermaidPreview } from '@/features/chat'
import { APP_ROUTES } from '@/shared/config'

type PreviewMode = 'image' | 'code'

interface MermaidPreviewRouteState {
  readonly mermaidSource?: unknown
}

function readRouteSource(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('mermaidSource' in state)) return null
  const { mermaidSource } = state as MermaidPreviewRouteState
  return typeof mermaidSource === 'string' ? mermaidSource : null
}

function hasPreviousAppEntry(): boolean {
  const state: unknown = window.history.state
  return (
    typeof state === 'object' &&
    state !== null &&
    'idx' in state &&
    typeof state.idx === 'number' &&
    state.idx > 0
  )
}

// 展示会话中暂存的 Mermaid 完整内容，并提供图片与源码两种查看方式。
export function MermaidPreviewPage() {
  const [mode, setMode] = useState<PreviewMode>('image')
  const [isDiagramReady, setIsDiagramReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const diagramHostRef = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)
  const { previewId } = useParams<{ previewId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const source =
    (previewId ? readMermaidPreview(previewId) : null) ?? readRouteSource(location.state)

  useEffect(() => {
    setIsDiagramReady(false)
    const host = diagramHostRef.current
    if (!host || !source) return

    const updateReadyState = (): void => {
      const svg = host.querySelector('svg')
      setIsDiagramReady(Boolean(svg?.innerHTML.trim()))
    }
    const observer = new MutationObserver(updateReadyState)
    observer.observe(host, { childList: true, subtree: true })
    updateReadyState()
    return () => observer.disconnect()
  }, [source])

  const handleBack = (): void => {
    if (hasPreviousAppEntry()) {
      void navigate(-1)
      return
    }
    void navigate(APP_ROUTES.home, { replace: true })
  }

  // 导出期间使用同步引用拦截连续点击，避免重复打开系统面板或下载多个文件。
  const handleDownload = useCallback(async (): Promise<void> => {
    if (savingRef.current) return
    const svg = diagramHostRef.current?.querySelector<SVGSVGElement>('svg')
    if (!svg?.innerHTML.trim()) return

    savingRef.current = true
    setIsSaving(true)
    setSaveError(null)
    try {
      const png = await createMermaidPng(svg)
      await saveMermaidPng(png)
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Mermaid PNG export]', error)
      setSaveError(getMermaidImageErrorMessage(error))
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          <span>返回</span>
        </button>
        <div className={styles.tabs} role="tablist" aria-label="预览模式">
          <button
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={mode === 'image'}
            disabled={!source}
            onClick={() => setMode('image')}
          >
            图片
          </button>
          <button
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={mode === 'code'}
            disabled={!source}
            onClick={() => setMode('code')}
          >
            代码
          </button>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.shareButton}
            aria-label="分享（功能开发中）"
            title="分享功能开发中"
            disabled
          >
            <Share2 size={18} aria-hidden="true" />
            <span>分享</span>
          </button>
          <button
            type="button"
            className={styles.downloadButton}
            aria-label={isSaving ? '正在生成图片' : '下载图片'}
            title={isSaving ? '正在生成图片' : '下载图片'}
            disabled={!source || !isDiagramReady || isSaving}
            onClick={() => void handleDownload()}
          >
            <Download size={18} aria-hidden="true" />
            <span>{isSaving ? '处理中…' : '下载'}</span>
          </button>
          <span className={styles.saveStatus} role="status" aria-live="polite">
            {isSaving ? '正在生成图片' : ''}
          </span>
        </div>
      </header>
      {saveError ? (
        <div className={styles.saveError} role="alert">
          {saveError}
        </div>
      ) : null}
      <main className={styles.content}>
        {source ? (
          <>
            <div ref={diagramHostRef} hidden={mode !== 'image'}>
              <MermaidDiagram className={styles.diagram} source={source} />
            </div>
            <div className={styles.code} hidden={mode !== 'code'}>
              <CodeHighlighter header={false}>{source}</CodeHighlighter>
            </div>
          </>
        ) : (
          <div className={styles.emptyState} role="alert">
            <h1 className={styles.emptyTitle}>预览内容已失效</h1>
            <p>当前会话中没有找到这份 Mermaid 内容，请返回聊天后重新打开。</p>
            <button type="button" className={styles.emptyButton} onClick={handleBack}>
              返回聊天
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
