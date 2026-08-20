import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import mermaid from 'mermaid'
import { Code, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

import { MERMAID_SOURCE } from '../../model/mermaidSource'
import styles from './MermaidViewer.module.scss'

const MIN_SCALE = 0.5
const MAX_SCALE = 2
const SCALE_STEP = 0.2

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

// mermaid 全局只需初始化一次；neutral 主题贴合页面黑白灰视觉。
let isMermaidReady = false
async function ensureMermaidReady(): Promise<void> {
  if (isMermaidReady) return
  mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
  isMermaidReady = true
}

interface DragState {
  readonly pointerId: number
  readonly startX: number
  readonly startY: number
  readonly baseOffsetX: number
  readonly baseOffsetY: number
}

interface ChartTransform {
  readonly x: number
  readonly y: number
  readonly scale: number
}

const INITIAL_TRANSFORM: ChartTransform = { x: 0, y: 0, scale: 1 }

export function MermaidViewer() {
  const [svg, setSvg] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const [transform, setTransform] = useState<ChartTransform>(INITIAL_TRANSFORM)
  const [isDragging, setIsDragging] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  // useId 含冒号等字符，需清理成合法的 SVG 元素 id。
  const chartId = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    let isCancelled = false
    void (async () => {
      try {
        await ensureMermaidReady()
        const { svg: rendered } = await mermaid.render(chartId, MERMAID_SOURCE)
        if (!isCancelled) setSvg(rendered)
      } catch {
        // 渲染失败时给用户友好提示，不向上抛出异常。
        if (!isCancelled) setHasError(true)
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [chartId])

  const zoomBy = useCallback((delta: number) => {
    setTransform((prev) => ({ ...prev, scale: clampScale(prev.scale + delta) }))
  }, [])

  const fitCanvas = useCallback(() => {
    setTransform(INITIAL_TRANSFORM)
  }, [])

  const toggleCode = useCallback(() => {
    setShowCode((prev) => !prev)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseOffsetX: transform.x,
      baseOffsetY: transform.y,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setTransform((prev) => ({
      ...prev,
      x: drag.baseOffsetX + event.clientX - drag.startX,
      y: drag.baseOffsetY + event.clientY - drag.startY,
    }))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      setIsDragging(false)
    }
  }

  if (hasError) {
    return (
      <section className={styles.viewer} aria-label="Mermaid 图表">
        <h2 className={styles.title}>Mermaid 美人鱼示例</h2>
        <p className={styles.error} role="alert">
          图表加载失败，请刷新页面重试。
        </p>
      </section>
    )
  }

  return (
    <section className={styles.viewer} aria-label="Mermaid 图表">
      <h2 className={styles.title}>Mermaid 美人鱼示例</h2>
      <div className={styles.frame}>
        <div className={styles.toolbar} role="toolbar" aria-label="图表工具">
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => zoomBy(-SCALE_STEP)}
            aria-label="缩小"
            title="缩小"
          >
            <ZoomOut size={18} />
          </button>
          <span className={styles.scaleLabel} aria-live="polite">
            {Math.round(transform.scale * 100)}%
          </span>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => zoomBy(SCALE_STEP)}
            aria-label="放大"
            title="放大"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={fitCanvas}
            aria-label="适配画布"
            title="适配画布"
          >
            <Maximize2 size={18} />
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${showCode ? styles.toolButtonActive : ''}`}
            onClick={toggleCode}
            aria-label="查看代码"
            aria-pressed={showCode}
            title="查看代码"
          >
            <Code size={18} />
            <span>查看代码</span>
          </button>
        </div>
        <div
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {svg ? (
            <div
              className={isDragging ? styles.chartDragging : styles.chart}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              }}
              // mermaid.render 输出的 SVG 字符串来自本地常量源码，属于可信内容。
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className={styles.loading}>图表渲染中…</p>
          )}
        </div>
      </div>
      {showCode ? (
        <pre className={styles.code}>
          <code>{MERMAID_SOURCE}</code>
        </pre>
      ) : null}
    </section>
  )
}
