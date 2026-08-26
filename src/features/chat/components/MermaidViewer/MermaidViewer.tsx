import { useCallback, useEffect, useRef, useState } from 'react'
import { Mermaid, type MermaidProps } from '@ant-design/x'

import styles from './MermaidViewer.module.scss'

interface MermaidViewerProps {
  readonly source: string
}

type RenderView = 'image' | 'code'
type RenderStatus = 'loading' | 'success' | 'error'

// Mermaid 首次渲染存在初始化竞争（mermaid.initialize 与 renderDiagram 分属两个独立 effect，
// 且 render 被 throttle 延迟），首次挂载时图表可能静默失败。
// 此延迟用于在检测到 SVG 未出现后强制重新挂载组件，给 mermaid 一次全新的渲染机会。
const RETRY_DELAY_MS = 2_000
const RENDER_TIMEOUT_MS = 8_000

const MERMAID_CONFIG: NonNullable<MermaidProps['config']> = {
  startOnLoad: false,
  securityLevel: 'strict',
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
  code: styles.code,
}

// 使用 Ant Design X 的标准交互渲染 Mermaid，并补充其未暴露的加载与失败状态。
export function MermaidViewer({ source }: MermaidViewerProps) {
  const [renderType, setRenderType] = useState<RenderView>('image')
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('loading')
  const [renderAttempt, setRenderAttempt] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (renderType === 'code') return

    const graph = frameRef.current?.querySelector(`.${styles.graph}`)
    if (!graph) {
      setRenderStatus('error')
      return
    }

    setRenderStatus('loading')
    let timeoutId: number | undefined
    let retryTimerId: number | undefined
    let retried = false

    // 官方组件没有渲染完成或失败回调，只能以非空 SVG 进入 DOM 作为成功信号。
    const markRendered = (): boolean => {
      const svg = graph.querySelector('svg')
      if (!svg?.innerHTML.trim()) return false

      setRenderStatus('success')
      observer.disconnect()
      clearTimers()
      return true
    }

    const clearTimers = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (retryTimerId !== undefined) window.clearTimeout(retryTimerId)
    }

    const observer = new MutationObserver(markRendered)
    observer.observe(graph, { childList: true, subtree: true })

    // 首次挂载时 mermaid.initialize 与 renderDiagram 分属两个独立 effect 且无同步保障，
    // 加上 renderDiagram 被 throttle 延迟，SVG 可能静默渲染失败。
    // 延迟后强制重新挂载 Mermaid 组件（通过 key 变化），此时初始化早已完成，渲染几乎必定成功。
    if (!markRendered()) {
      retryTimerId = window.setTimeout(() => {
        if (!retried) {
          retried = true
          const svg = graph.querySelector('svg')
          if (!svg?.innerHTML.trim()) {
            setRenderAttempt((prev) => prev + 1)
          }
        }
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
  }, [renderAttempt, renderType, source])

  const handleRenderTypeChange = useCallback<NonNullable<MermaidProps['onRenderTypeChange']>>(
    (nextRenderType) => {
      setRenderType(nextRenderType === 'code' ? 'code' : 'image')
    },
    [],
  )

  const handleRetry = useCallback(() => {
    setRenderStatus('loading')
    setRenderAttempt((attempt) => attempt + 1)
  }, [])

  return (
    <section className={styles.viewer} aria-label="Mermaid 图表">
      <div ref={frameRef} className={styles.frame}>
        <Mermaid
          key={`${renderAttempt}-${source}`}
          className={styles.mermaid}
          classNames={MERMAID_CLASS_NAMES}
          config={MERMAID_CONFIG}
          onRenderTypeChange={handleRenderTypeChange}
        >
          {source}
        </Mermaid>
        {renderType === 'image' && renderStatus !== 'success' ? (
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
    </section>
  )
}
