import type { ChatMessageContent, ResponseChart, ResponseChartType } from '../model/types'

const CHART_LOAD_ERROR = '图表数据暂不可用。'
const PROTOCOL_ERROR = '回答格式异常，请重试。'
const CHART_MARKER_PATTERN = /\{\{chart:([^{}]+)\}\}/g
const JSON_FENCE_PATTERN = /^```json[\t ]*\r?\n([\s\S]*?)\r?\n?```[\t ]*$/i
const CHART_TYPES = new Set<ResponseChartType>(['pie', 'bar', 'line'])

interface ParseChartEnvelopeOptions {
  readonly parseText: (text: string) => ChatMessageContent[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isResponseChartType(value: unknown): value is ResponseChartType {
  return typeof value === 'string' && CHART_TYPES.has(value as ResponseChartType)
}

// 模型数据只允许有限数值和非空名称，整张非法图表统一在引用位置降级。
function parseResponseChart(value: unknown): ResponseChart | null {
  if (!isRecord(value)) return null
  const { chartId, type, title, data } = value
  if (
    typeof chartId !== 'string' ||
    chartId.trim() === '' ||
    !isResponseChartType(type) ||
    typeof title !== 'string' ||
    title.trim() === '' ||
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return null
  }
  if (
    !data.every(
      (datum) =>
        isRecord(datum) &&
        typeof datum.name === 'string' &&
        datum.name.trim() !== '' &&
        typeof datum.value === 'number' &&
        Number.isFinite(datum.value),
    )
  ) {
    return null
  }

  return {
    chartId,
    type,
    title,
    data: data.map((datum) => ({ name: String(datum.name), value: Number(datum.value) })),
  }
}

// 构建带无效占位的索引；重复 ID 会使该 ID 整体失效，避免引用结果取决于数组顺序。
function indexResponseCharts(charts: readonly unknown[]): Map<string, ResponseChart | null> {
  const index = new Map<string, ResponseChart | null>()
  const duplicateIds = new Set<string>()

  charts.forEach((value) => {
    if (!isRecord(value) || typeof value.chartId !== 'string' || value.chartId.trim() === '') return
    const chartId = value.chartId
    if (index.has(chartId)) duplicateIds.add(chartId)
    else index.set(chartId, parseResponseChart(value))
  })
  duplicateIds.forEach((chartId) => index.set(chartId, null))
  return index
}

// 将协议正文按标记拆分，并让每段普通文本继续复用既有结构化内容解析链路。
function composeChartContent(
  rawContent: string,
  charts: Map<string, ResponseChart | null>,
  parseText: ParseChartEnvelopeOptions['parseText'],
): ChatMessageContent[] {
  const content: ChatMessageContent[] = []
  let textStart = 0

  for (const match of rawContent.matchAll(CHART_MARKER_PATTERN)) {
    if (match.index === undefined) continue
    content.push(...parseText(rawContent.slice(textStart, match.index)))
    const chart = charts.get(match[1] ?? '')
    content.push(
      chart ? { type: 'chart', chart } : { type: 'chart-error', message: CHART_LOAD_ERROR },
    )
    textStart = match.index + match[0].length
  }
  content.push(...parseText(rawContent.slice(textStart)))
  return content
}

// 识别纯 JSON 或单层 json 围栏；普通历史文本返回 null，交回旧消息解析器。
export function parseChartResponseEnvelope(
  rawContent: string,
  options: ParseChartEnvelopeOptions,
): ChatMessageContent[] | null {
  const trimmed = rawContent.trim()
  const fenceMatch = JSON_FENCE_PATTERN.exec(trimmed)
  const source = fenceMatch?.[1] ?? trimmed
  if (!fenceMatch && !trimmed.startsWith('{')) return null

  let envelope: unknown
  try {
    envelope = JSON.parse(source)
  } catch {
    return [{ type: 'chart-error', message: PROTOCOL_ERROR }]
  }
  if (
    !isRecord(envelope) ||
    typeof envelope.content !== 'string' ||
    !Array.isArray(envelope.charts)
  ) {
    return [{ type: 'chart-error', message: PROTOCOL_ERROR }]
  }
  return composeChartContent(
    envelope.content,
    indexResponseCharts(envelope.charts),
    options.parseText,
  )
}
