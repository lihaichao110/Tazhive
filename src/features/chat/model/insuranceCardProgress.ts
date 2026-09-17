import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

import type { ChatMessage, DynamicCardMessageContent } from './types'

/** 保险流程卡片的进度元信息：步骤号来自步骤指示器，hasSubmit 表示带可提交表单。 */
interface InsuranceCardMeta {
  readonly step: number
  readonly hasSubmit: boolean
}

/** 从卡片命令读取步骤指示器的当前步骤；无指示器返回 null，调用方用于识别投保流程卡片。 */
export function readInsuranceCardStep(commands: readonly XAgentCommand_v0_9[]): number | null {
  for (const command of commands) {
    if (!('updateComponents' in command)) continue
    for (const node of command.updateComponents.components) {
      if (node.component === 'InsuranceStepIndicator' && typeof node.current === 'number') {
        return node.current
      }
    }
  }
  return null
}

/** 从卡片命令解析保险流程元信息；没有步骤指示器的卡片不属于投保流程。 */
function readInsuranceCardMeta(card: DynamicCardMessageContent): InsuranceCardMeta | null {
  const step = readInsuranceCardStep(card.commands)
  if (step === null) return null
  let hasSubmit = false
  for (const command of card.commands) {
    if (!('updateComponents' in command)) continue
    for (const node of command.updateComponents.components) {
      if (node.component === 'InsuranceSubmitButton') hasSubmit = true
    }
  }
  return { step, hasSubmit }
}

/** 完成卡不带步骤指示器，需单独识别；其出现即投保流程终态。 */
function hasInsuranceCompletion(card: DynamicCardMessageContent): boolean {
  return card.commands.some(
    (command) =>
      'updateComponents' in command &&
      command.updateComponents.components.some((node) => node.component === 'InsuranceCompletion'),
  )
}

/**
 * 判定保险表单卡片在当前消息列表中是否已被后续步骤超越而成为陈旧卡片。
 * 规则：仅位于最大流程步骤、且带提交按钮的最后一张表单卡片仍可操作；
 * 历史消息中更早步骤的表单，以及流程已推进到只读终态（信息确认/完成）后的全部表单，
 * 都必须视为陈旧并禁用，防止客户改写已提交资料或对过期步骤重复提交。
 * 终态信号有两个：带步骤指示器的只读卡，以及不含指示器的完成卡（InsuranceCompletion）。
 * 消息列表中不存在任何投保流程卡片时（如脱离会话的独立渲染）不限制。
 */
export function isStaleInsuranceFormCard(
  card: DynamicCardMessageContent,
  messages: readonly ChatMessage[],
): boolean {
  if (!readInsuranceCardMeta(card)) return false
  let maxStep = 0
  let activeSurfaceId: string | null = null
  let flowCompleted = false
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type !== 'dynamic-card') continue
      if (hasInsuranceCompletion(block)) flowCompleted = true
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
  // 完成卡出现即流程终态：所有表单卡（含方案确认卡）一律陈旧，刷新后也保持禁用。
  if (flowCompleted) return true
  if (maxStep === 0) return false
  return activeSurfaceId === null || card.surfaceId !== activeSurfaceId
}
