import { useState, type CSSProperties, type ReactNode } from 'react'

import styles from './PlanDynamicCard.module.scss'

interface ChildrenProps {
  readonly children?: ReactNode
}

interface PlanCardProps extends ChildrenProps {
  readonly groupCode: string
  readonly groupName: string
  readonly title: string
  readonly hasSale?: boolean
}

interface PlanImageProps {
  readonly url: string
  readonly altText: string
}

interface PlanPointsProps {
  readonly items?: readonly unknown[]
}

interface PlanActionButtonProps {
  readonly text: string
  readonly backgroundColor?: string
  readonly color?: string
  readonly borderRadius?: string
  readonly action?: {
    readonly event?: {
      readonly name?: string
      readonly context?: Readonly<Record<string, unknown>>
    }
  }
  readonly onAction?: (name: string, context: Readonly<Record<string, unknown>>) => void
}

// 承载模型返回的方案集合，子节点顺序完全遵循 A2UI children 邻接关系。
export function PlanList({ children }: ChildrenProps) {
  return (
    <section className={styles.list} aria-label="保险方案列表">
      {children}
    </section>
  )
}

// 展示单个保险方案的基本信息与模型声明的可选内容。
export function PlanCard({ children, groupCode, groupName, hasSale, title }: PlanCardProps) {
  return (
    <article className={styles.card} data-plan-code={groupCode}>
      <header className={styles.header}>
        <div className={styles.headingRow}>
          <h3 className={styles.groupName}>{groupName}</h3>
          <div className={styles.badges}>
            {title.trim() ? <span className={styles.title}>{title}</span> : null}
            {typeof hasSale === 'boolean' ? (
              <span className={hasSale ? styles.available : styles.unavailable}>
                {hasSale ? '可投保' : '暂不可投保'}
              </span>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </article>
  )
}

// 图片加载失败时收起媒体区域，避免无效远程地址破坏卡片布局。
export function PlanImage({ altText, url }: PlanImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed || !url) return null
  return (
    <img
      className={styles.image}
      src={url}
      alt={altText}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function PlanPoints({ items }: PlanPointsProps) {
  const textItems = items?.filter((item): item is string => typeof item === 'string') ?? []
  if (textItems.length === 0) return null
  const occurrences = new Map<string, number>()
  const points = textItems.map((text) => {
    const occurrence = (occurrences.get(text) ?? 0) + 1
    occurrences.set(text, occurrence)
    return { key: `${text}-${occurrence}`, text }
  })
  return (
    <ul className={styles.points} aria-label="方案亮点">
      {points.map((point) => (
        <li key={point.key}>{point.text}</li>
      ))}
    </ul>
  )
}

export function PlanActions({ children }: ChildrenProps) {
  return <div className={styles.actions}>{children}</div>
}

// 将按钮声明中的字面量上下文交回 XCard，由宿主统一组装并发送模型请求。
export function PlanActionButton({
  action,
  backgroundColor,
  borderRadius,
  color,
  onAction,
  text,
}: PlanActionButtonProps) {
  const name = action?.event?.name
  const context = action?.event?.context ?? {}
  const buttonStyle: CSSProperties = { backgroundColor, borderRadius, color }

  return (
    <button
      className={styles.actionButton}
      type="button"
      style={buttonStyle}
      disabled={!name}
      onClick={() => name && onAction?.(name, context)}
    >
      {text}
    </button>
  )
}
