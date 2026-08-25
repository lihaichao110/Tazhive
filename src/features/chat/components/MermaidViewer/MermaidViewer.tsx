import { useCallback, useEffect, useId, useState } from 'react'
import { Code, Scan, Workflow } from 'lucide-react'

import { useChartTransform } from '../../hooks/useChartTransform'
import { renderMermaidDiagram } from '../../lib/renderMermaidDiagram'
import styles from './MermaidViewer.module.scss'

interface MermaidViewerProps {
  readonly source: string
}

// 将 Mermaid 源码异步渲染为可缩放画布，并支持在图形与源码视图间切换。
export function MermaidViewer({ source }: MermaidViewerProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const {
    transform,
    isInteracting,
    resetTransform,
    setCanvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleKeyDown,
  } = useChartTransform()
  // useId 含冒号等字符，需清理成合法的 SVG 元素 id。
  const chartId = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    // source 更新时先清除旧结果，避免新图渲染期间短暂显示上一张图。
    let isCancelled = false
    setSvg(null)
    setHasError(false)
    void (async () => {
      try {
        const rendered = await renderMermaidDiagram(chartId, source)
        if (!isCancelled) setSvg(rendered)
      } catch {
        // 渲染失败时给用户友好提示，不向上抛出异常。
        if (!isCancelled) setHasError(true)
      }
    })()
    return () => {
      // Mermaid 渲染无法直接取消，用标记阻止卸载后或旧请求晚到时写入状态。
      isCancelled = true
    }
  }, [chartId, source])

  const toggleCode = useCallback(() => {
    setShowCode((prev) => !prev)
  }, [])

  const toggleViewLabel = showCode ? '查看图形' : '查看代码'

  if (hasError) {
    return (
      <section className={styles.viewer} aria-label="Mermaid 图表">
        <h2 className={styles.title}>Mermaid 图表</h2>
        <p className={styles.error} role="alert">
          图表加载失败，请刷新页面重试。
        </p>
      </section>
    )
  }

  return (
    <section className={styles.viewer} aria-label="Mermaid 图表">
      <h2 className={styles.title}>Mermaid 图表</h2>
      <div className={styles.frame}>
        <div className={styles.toolbar} role="toolbar" aria-label="图表工具">
          {!showCode ? (
            <button
              type="button"
              className={styles.toolButton}
              onClick={resetTransform}
              aria-label="适配画布"
              title="适配画布"
            >
              <Scan size={18} />
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.toolButton} ${showCode ? styles.toolButtonActive : ''}`}
            onClick={toggleCode}
            aria-label={toggleViewLabel}
            aria-pressed={showCode}
            title={toggleViewLabel}
          >
            {showCode ? <Workflow size={18} /> : <Code size={18} />}
            <span>{toggleViewLabel}</span>
          </button>
        </div>
        {showCode ? (
          <pre className={styles.code} aria-label="Mermaid 源码">
            <code>{source}</code>
          </pre>
        ) : (
          <div
            ref={setCanvasRef}
            className={styles.canvas}
            role="region"
            tabIndex={0}
            aria-label="可交互 Mermaid 图表：滚轮或双指缩放，拖动平移，按加号或减号缩放，按 0 复位"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            onKeyDown={handleKeyDown}
          >
            {svg ? (
              <div
                className={isInteracting ? styles.chartInteracting : styles.chart}
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
                // Mermaid 在 strict 模式下处理不可信源码，此处只注入其渲染结果。
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <p className={styles.loading}>图表渲染中…</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
