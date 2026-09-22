import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Globe2 } from 'lucide-react'

import type { ChatReference } from '../../model/types'
import styles from './MessageSources.module.scss'

interface SourcePopoverContentProps {
  readonly references: readonly ChatReference[]
  readonly onSelect: (reference: ChatReference) => void
}

/** 在来源浮层中分页展示来源，并将选中的完整来源交给上层处理。 */
export function SourcePopoverContent({ references, onSelect }: SourcePopoverContentProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, references.length - 1)))
  }, [references.length])

  const reference = references[activeIndex]
  if (!reference) return null

  return (
    <div className={styles.popoverContent} aria-label="引用来源列表">
      <div className={styles.pagination}>
        <div className={styles.paginationButtons}>
          <button
            type="button"
            className={styles.paginationButton}
            aria-label="上一个来源"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.paginationButton}
            aria-label="下一个来源"
            disabled={activeIndex === references.length - 1}
            onClick={() => setActiveIndex((index) => Math.min(references.length - 1, index + 1))}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <span className={styles.pageNumber} aria-live="polite">
          {activeIndex + 1}/{references.length}
        </span>
      </div>
      <button
        type="button"
        className={styles.sourceCard}
        aria-label={`打开来源：${reference.title}`}
        onClick={() => onSelect(reference)}
      >
        <span className={styles.sourceTitle}>
          {reference.source_type === 'web' ? (
            <Globe2 size={15} aria-hidden="true" />
          ) : (
            <FileText size={15} aria-hidden="true" />
          )}
          <span>{reference.title}</span>
        </span>
        {reference.snippet ? (
          <span className={styles.sourceDescription}>{reference.snippet}</span>
        ) : null}
      </button>
    </div>
  )
}
