const MIN_SCALE = 0.5
const MAX_SCALE = 2

export interface Point {
  readonly x: number
  readonly y: number
}

export interface ChartTransform {
  readonly x: number
  readonly y: number
  readonly scale: number
}

export const INITIAL_TRANSFORM: ChartTransform = { x: 0, y: 0, scale: 1 }

// 将所有缩放入口统一限制在可操作范围内，避免画布过小或无限放大。
export function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

// 计算双指手势的视觉中心，作为缩放锚点。
export function getCenter(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

// 计算双指间距，用于推导相对缩放比例。
export function getDistance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

// 将视口坐标转换为以画布中心为原点的坐标，与 CSS transform 的平移模型保持一致。
export function toCanvasPoint(element: HTMLDivElement, point: Point): Point {
  const rect = element.getBoundingClientRect()
  return {
    x: point.x - rect.left - rect.width / 2,
    y: point.y - rect.top - rect.height / 2,
  }
}

// 调整缩放与平移，使指定锚点在缩放前后仍对应同一图表位置。
export function zoomAroundPoint(
  transform: ChartTransform,
  scale: number,
  anchor: Point,
): ChartTransform {
  const nextScale = clampScale(scale)
  const ratio = nextScale / transform.scale

  return {
    x: anchor.x - ratio * (anchor.x - transform.x),
    y: anchor.y - ratio * (anchor.y - transform.y),
    scale: nextScale,
  }
}
