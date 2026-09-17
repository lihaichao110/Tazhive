import type { ThreadMessageRead } from './listThreadMessages'
import type { InsuranceActionPayload } from '../model/types'

import { createHttpClient, HttpError } from '@/shared/api'

export interface InsuranceActionResponse {
  readonly outcome: 'advanced' | 'completed' | 'duplicate'
  readonly application_id: string
  readonly current_step: 'APPLICANT' | 'INSURED' | 'CONFIRM' | 'COMPLETED'
  readonly version: number
  readonly user_message: ThreadMessageRead | null
  readonly assistant_message: ThreadMessageRead
}

export class InsuranceActionError extends Error {
  readonly fieldErrors: Readonly<Record<string, string>>

  constructor(message: string, fieldErrors: Readonly<Record<string, string>> = {}) {
    super(message)
    this.name = 'InsuranceActionError'
    this.fieldErrors = fieldErrors
  }
}

const insuranceClient = createHttpClient()

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

// 兼容 XCard 将路径引用解析为 { value: data } 的结构，对外始终使用扁平表单契约。
export function normalizeInsuranceActionContext(
  context: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const form = context.form
  if (isRecord(form) && Object.keys(form).length === 1 && isRecord(form.value)) {
    return { ...context, form: form.value }
  }
  return context
}

function readFieldErrors(data: unknown): Readonly<Record<string, string>> {
  if (!data || typeof data !== 'object' || !('detail' in data)) return {}
  const detail = data.detail
  if (!detail || typeof detail !== 'object' || !('field_errors' in detail)) return {}
  const errors = detail.field_errors
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

// 将 XCard action 映射到确定性投保接口，个人资料不经过聊天消息正文。
export async function requestInsuranceAction(
  threadId: string,
  payload: InsuranceActionPayload,
): Promise<InsuranceActionResponse> {
  const context = normalizeInsuranceActionContext(payload.context)
  const applicationId = context.application_id
  const expectedVersion = context.expected_version
  const body = {
    event_id: payload.eventId ?? crypto.randomUUID(),
    name: payload.name,
    source_surface_id: payload.surfaceId,
    application_id: typeof applicationId === 'string' ? applicationId : undefined,
    expected_version: typeof expectedVersion === 'number' ? expectedVersion : undefined,
    context,
  }
  try {
    const response = await insuranceClient.post<InsuranceActionResponse>(
      `/api/v1/threads/${encodeURIComponent(threadId)}/insurance/actions`,
      body,
    )
    return response.data
  } catch (error) {
    if (error instanceof HttpError) {
      throw new InsuranceActionError(error.message, readFieldErrors(error.data))
    }
    throw error
  }
}
