import type { ChatMessage, DynamicCardMessageContent } from './types'

/** 保险流程卡片的进度元信息：步骤号来自步骤指示器，hasSubmit 表示带可提交表单。 */
interface InsuranceCardMeta {
  readonly step: number
  readonly hasSubmit: boolean
}

/** 从卡片命令解析保险流程元信息；没有步骤指示器的卡片不属于投保流程。 */
function readInsuranceCardMeta(card: DynamicCardMessageContent): InsuranceCardMeta | null {
  let step: number | null = null
  let hasSubmit = false
  for (const command of card.commands) {
    if (!('updateComponents' in command)) continue
    for (const node of command.updateComponents.components) {
      if (node.component === 'InsuranceStepIndicator' && typeof node.current === 'number') {
        step = node.current
      }
      if (node.component === 'InsuranceSubmitButton') hasSubmit = true
    }
  }
  return step === null ? null : { step, hasSubmit }
}

/**
 * 判定保险表单卡片在当前消息列表中是否已被后续步骤超越而成为陈旧卡片。
 * 规则：仅位于最大流程步骤、且带提交按钮的最后一张表单卡片仍可操作；
 * 历史消息中更早步骤的表单，以及流程已推进到只读终态（信息确认/完成）后的全部表单，
 * 都必须视为陈旧并禁用，防止客户改写已提交资料或对过期步骤重复提交。
 * 消息列表中不存在任何投保流程卡片时（如脱离会话的独立渲染）不限制。
 */
export function isStaleInsuranceFormCard(
  card: DynamicCardMessageContent,
  messages: readonly ChatMessage[],
): boolean {
  if (!readInsuranceCardMeta(card)) return false
  let maxStep = 0
  let activeSurfaceId: string | null = null
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type !== 'dynamic-card') continue
      const meta = readInsuranceCardMeta(block)
      if (!meta) continue
      // 出现更大步骤时，之前记录的低步骤活跃卡片立即作废。
      if (meta.step > maxStep) {
        maxStep = meta.step
        activeSurfaceId = null
      }
      if (meta.step === maxStep && meta.hasSubmit) activeSurfaceId = block.surfaceId
    }
  }
  if (maxStep === 0) return false
  return activeSurfaceId === null || card.surfaceId !== activeSurfaceId
}
