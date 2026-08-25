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

export function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

export function getCenter(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

export function getDistance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

export function toCanvasPoint(element: HTMLDivElement, point: Point): Point {
  const rect = element.getBoundingClientRect()
  return {
    x: point.x - rect.left - rect.width / 2,
    y: point.y - rect.top - rect.height / 2,
  }
}

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
