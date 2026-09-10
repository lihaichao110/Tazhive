import type { ChatMessageContent, ResponseChart, ResponseChartType } from '../model/types'

const CHART_LOAD_ERROR = '图表数据暂不可用。'
const CHART_MARKER_PATTERN = /\{\{chart:([^{}]+)\}\}/g
const JSON_FENCE_PATTERN = /^```json[\t ]*\r?\n([\s\S]*?)\r?\n?```[\t ]*$/i
const JSON_FENCE_OPEN_PATTERN = /^```json[\t ]*\r?\n/i
const CONTENT_PREFIX_PATTERN = /^\s*\{\s*"content"\s*:\s*"/i
const CHARTS_TAIL_PATTERN = /"\s*,\s*"charts"\s*:\s*\[[\s\S]*$/i
const RELAXED_ENVELOPE_PATTERN =
  /^\s*\{\s*"content"\s*:\s*"([\s\S]*)"\s*,\s*"charts"\s*:\s*(\[[\s\S]*\])\s*\}\s*$/i
const CHART_TYPES = new Set<ResponseChartType>(['pie', 'bar', 'line'])

interface ParseChartEnvelopeOptions {
  readonly parseText: (text: string) => ChatMessageContent[]
  readonly streaming?: boolean
}

interface ChartResponseEnvelope {
  readonly content: string
  readonly charts: readonly unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isResponseChartType(value: unknown): value is ResponseChartType {
  return typeof value === 'string' && CHART_TYPES.has(value as ResponseChartType)
}

// 标准 JSON 失败时兼容模型输出的多行正文，图表数组仍单独按 JSON 校验。
function parseResponseEnvelope(source: string): ChartResponseEnvelope | null {
  try {
    const envelope: unknown = JSON.parse(source)
    if (!isRecord(envelope) || typeof envelope.content !== 'string') return null
    return {
      content: envelope.content,
      charts: Array.isArray(envelope.charts) ? envelope.charts : [],
    }
  } catch {
    const match = RELAXED_ENVELOPE_PATTERN.exec(source)
    if (match?.[1] === undefined || !match[2]) return null
    try {
      const charts: unknown = JSON.parse(match[2])
      return { content: match[1], charts: Array.isArray(charts) ? charts : [] }
    } catch {
      return { content: match[1], charts: [] }
    }
  }
}

// 流式阶段只移除固定协议边界，正文立即展示，图表留到响应结束后处理。
function parseStreamingContent(
  source: string,
  parseText: ParseChartEnvelopeOptions['parseText'],
): ChatMessageContent[] | null {
  const envelope = parseResponseEnvelope(source)
  if (envelope) return parseText(envelope.content.replace(CHART_MARKER_PATTERN, ''))

  const prefix = CONTENT_PREFIX_PATTERN.exec(source)
  if (!prefix) return source.trimStart().startsWith('{') ? [] : null
  const content = source
    .slice(prefix[0].length)
    .replace(CHARTS_TAIL_PATTERN, '')
    .replace(CHART_MARKER_PATTERN, '')
    .replace(/\{\{(?:chart(?::[^{}]*)?)?$/, '')
  return parseText(content)
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
  const source = fenceMatch?.[1] ?? trimmed.replace(JSON_FENCE_OPEN_PATTERN, '')
  if (!fenceMatch && !trimmed.startsWith('{') && !JSON_FENCE_OPEN_PATTERN.test(trimmed)) return null
  if (options.streaming) return parseStreamingContent(source, options.parseText)

  const envelope = parseResponseEnvelope(source)
  if (!envelope) return null
  // 图表字段缺失或无效只影响引用位置，不丢弃已经成功返回的正文。
  return composeChartContent(
    envelope.content,
    indexResponseCharts(envelope.charts),
    options.parseText,
  )
}
