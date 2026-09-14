import {
  ALLOWED_PLAN_ACTIONS,
  PLAN_APPLY_ACTION,
  PLAN_PRE_UNDERWRITE_ACTION,
} from '../model/planCard'
import type { CardActionPayload } from '../model/types'

interface CardActionEnvelope {
  readonly type: 'a2ui_action'
  readonly name: string
  readonly surfaceId: string
  readonly context: Readonly<Record<string, unknown>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// 只接受当前方案卡片声明的动作，避免把任意 JSON 伪装成用户可读的卡片操作。
export function parseCardActionMessage(source: string): CardActionPayload | null {
  try {
    const value: unknown = JSON.parse(source)
    if (
      !isRecord(value) ||
      value.type !== 'a2ui_action' ||
      typeof value.name !== 'string' ||
      !ALLOWED_PLAN_ACTIONS.has(value.name) ||
      typeof value.surfaceId !== 'string' ||
      value.surfaceId === '' ||
      !isRecord(value.context)
    ) {
      return null
    }
    return { name: value.name, surfaceId: value.surfaceId, context: value.context }
  } catch {
    return null
  }
}

// 将 XCard Action 编码为可持久化、可被模型稳定识别的用户消息正文。
export function serializeCardActionMessage(payload: CardActionPayload): string {
  const envelope: CardActionEnvelope = {
    type: 'a2ui_action',
    name: payload.name,
    surfaceId: payload.surfaceId,
    context: payload.context,
  }
  return JSON.stringify(envelope)
}

// 对话界面只展示动作摘要，完整业务上下文仍通过请求正文传给模型。
export function formatCardActionSummary(payload: CardActionPayload): string {
  const groupName = payload.context.group_name
  const planName =
    typeof groupName === 'string' && groupName.trim() ? `「${groupName.trim()}」` : '该方案'
  if (payload.name === PLAN_PRE_UNDERWRITE_ACTION) return `已选择${planName}进行预核保`
  if (payload.name === PLAN_APPLY_ACTION) return `已选择${planName}正式投保`
  return `已操作${planName}`
}
