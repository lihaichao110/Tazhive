import type { MessageInfo } from '@ant-design/x-sdk'

import type { DeepSeekMessage } from '../api/deepSeekProvider'
import { createInsuranceMockReply } from '../model/insuranceCard'
import type { ChatQuote, InsuranceSubmission } from '../model/types'
import { formatInsuranceConfirmation } from './insuranceSubmission'

// 构造本地模拟的一问一答，消息形态与真实聊天 Provider 保持一致。
export function createInsuranceConversationMessages(
  content: string,
  quote?: ChatQuote,
): MessageInfo<DeepSeekMessage>[] {
  const requestId = crypto.randomUUID()
  return [
    {
      id: `user-${requestId}`,
      message: { role: 'user', content, quote },
      status: 'local',
    },
    {
      id: `assistant-${requestId}`,
      message: {
        role: 'assistant',
        content: createInsuranceMockReply(`insurance-${requestId}`),
      },
      status: 'success',
    },
  ]
}

// 将表单提交结果封装为一条普通助手消息，复用现有 Markdown 渲染链路。
export function createInsuranceConfirmationMessage(
  submission: InsuranceSubmission,
): MessageInfo<DeepSeekMessage> {
  return {
    id: `insurance-confirmation-${crypto.randomUUID()}`,
    message: {
      role: 'assistant',
      content: formatInsuranceConfirmation(submission),
    },
    status: 'success',
  }
}
