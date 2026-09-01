import { useCallback, useEffect, useRef, useState } from 'react'
import { Mermaid, type MermaidProps } from '@ant-design/x'

import styles from './MermaidDiagram.module.scss'
import { useMermaidPanzoom } from './useMermaidPanzoom'

interface MermaidDiagramProps {
  readonly className?: string
  readonly source: string
}

type RenderStatus = 'loading' | 'success' | 'error'

// Mermaid 初始化和实际渲染分属异步 effect，首次静默失败时通过重新挂载恢复。
const RETRY_DELAY_MS = 2_000
const RENDER_TIMEOUT_MS = 8_000

const MERMAID_CONFIG: NonNullable<MermaidProps['config']> = {
  startOnLoad: false,
  securityLevel: 'strict',
  // 原生 SVG 文本可被浏览器稳定栅格化，避免 foreignObject 阻断 PNG 导出。
  htmlLabels: false,
  theme: 'base',
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#eef2ff',
    primaryBorderColor: '#818cf8',
    primaryTextColor: '#1f2937',
    secondaryColor: '#f5f3ff',
    tertiaryColor: '#ecfeff',
    lineColor: '#94a3b8',
    textColor: '#1f2937',
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  },
}

const MERMAID_CLASS_NAMES: NonNullable<MermaidProps['classNames']> = {
  graph: styles.graph,
}

// 只负责 Mermaid 图片渲染及加载、失败、重试状态，不承载页面级工具栏。
export function MermaidDiagram({ className, source }: MermaidDiagramProps) {
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('loading')
  const [renderAttempt, setRenderAttempt] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const graph = frameRef.current?.querySelector(`.${styles.graph}`)
    if (!graph) {
      setRenderStatus('error')
      return
    }

    setRenderStatus('loading')
    let timeoutId: number | undefined
    let retryTimerId: number | undefined

    const clearTimers = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (retryTimerId !== undefined) window.clearTimeout(retryTimerId)
    }

    // 官方组件没有完成回调，以非空 SVG 进入 DOM 作为渲染成功信号。
    const markRendered = (): boolean => {
      const svg = graph.querySelector('svg')
      if (!svg?.innerHTML.trim()) return false

      setRenderStatus('success')
      observer.disconnect()
      clearTimers()
      return true
    }

    const observer = new MutationObserver(markRendered)
    observer.observe(graph, { childList: true, subtree: true })

    if (!markRendered()) {
      retryTimerId = window.setTimeout(() => {
        const svg = graph.querySelector('svg')
        if (!svg?.innerHTML.trim()) setRenderAttempt((attempt) => attempt + 1)
      }, RETRY_DELAY_MS)

      timeoutId = window.setTimeout(() => {
        observer.disconnect()
        setRenderStatus('error')
      }, RENDER_TIMEOUT_MS)
    }

    return () => {
      observer.disconnect()
      clearTimers()
    }
  }, [renderAttempt, source])

  const handleRetry = useCallback(() => {
    setRenderStatus('loading')
    setRenderAttempt((attempt) => attempt + 1)
  }, [])

  const renderKey = `${renderAttempt}-${source}`
  const frameClassName = className ? `${styles.frame} ${className}` : styles.frame
  useMermaidPanzoom({
    enabled: renderStatus === 'success',
    frameRef,
    graphClassName: styles.graph,
    renderKey,
  })

  return (
    <div ref={frameRef} className={frameClassName}>
      <Mermaid
        key={renderKey}
        className={styles.mermaid}
        classNames={MERMAID_CLASS_NAMES}
        config={MERMAID_CONFIG}
        header={null}
      >
        {source}
      </Mermaid>
      {renderStatus !== 'success' ? (
        <div className={`${styles.status} ${renderStatus === 'error' ? styles.statusError : ''}`}>
          {renderStatus === 'loading' ? (
            <p role="status" aria-live="polite">
              图表渲染中…
            </p>
          ) : (
            <div role="alert" className={styles.errorContent}>
              <p>图表渲染失败，请检查源码或重新渲染。</p>
              <button type="button" className={styles.retryButton} onClick={handleRetry}>
                重新渲染
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
