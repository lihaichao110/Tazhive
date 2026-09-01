import { Maximize2 } from 'lucide-react'
import { useNavigate } from 'react-router'

import { createMermaidPreview } from '../../lib/mermaidPreviewSession'
import { MermaidDiagram } from './MermaidDiagram'
import styles from './MermaidViewer.module.scss'

import { getMermaidPreviewPath } from '@/shared/config'

interface MermaidViewerProps {
  readonly source: string
}

interface MermaidPreviewRouteState {
  readonly mermaidSource: string
}

// 在聊天消息中提供 Mermaid 图片缩略预览，并将完整内容交给独立页面展示。
export function MermaidViewer({ source }: MermaidViewerProps) {
  const navigate = useNavigate()

  const handleOpenPreview = (): void => {
    const previewId = createMermaidPreview(source)
    const state: MermaidPreviewRouteState = { mermaidSource: source }
    void navigate(getMermaidPreviewPath(previewId), { state })
  }

  return (
    <section className={styles.viewer} aria-label="Mermaid 图表">
      <div className={styles.header}>
        <button type="button" className={styles.previewButton} onClick={handleOpenPreview}>
          <Maximize2 size={16} aria-hidden="true" />
          查看完整内容
        </button>
      </div>
      <MermaidDiagram className={styles.diagram} source={source} />
    </section>
  )
}
