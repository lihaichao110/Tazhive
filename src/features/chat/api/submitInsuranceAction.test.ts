import { afterEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, createHttpClient: () => ({ post }) }
})

import { HttpError } from '@/shared/api'

import { InsuranceActionError, requestInsuranceAction } from './submitInsuranceAction'

describe('requestInsuranceAction', () => {
  afterEach(() => post.mockReset())

  it('将 A2UI context 发送到线程投保接口', async () => {
    const response = {
      outcome: 'advanced',
      application_id: 'app',
      current_step: 'INSURED',
      version: 1,
      user_message: null,
    }
    post.mockResolvedValueOnce({ data: response })
    await expect(
      requestInsuranceAction('thread/1', {
        name: 'applicant_submit',
        surfaceId: 'surface-1',
        context: {
          application_id: 'app',
          expected_version: 1,
          form: { value: { name: '张三' } },
        },
      }),
    ).resolves.toBe(response)
    expect(post).toHaveBeenCalledWith(
      '/api/v1/threads/thread%2F1/insurance/actions',
      expect.objectContaining({
        name: 'applicant_submit',
        source_surface_id: 'surface-1',
        application_id: 'app',
        expected_version: 1,
        context: {
          application_id: 'app',
          expected_version: 1,
          form: { name: '张三' },
        },
      }),
    )
  })

  it('只向表单暴露后端字段错误，不拼接原始输入', async () => {
    post.mockRejectedValueOnce(
      new HttpError('请检查投保人信息', {
        status: 422,
        data: { detail: { field_errors: { mobile: '手机号格式错误' } } },
      }),
    )
    const promise = requestInsuranceAction('thread', {
      name: 'applicant_submit',
      surfaceId: 'surface',
      context: {},
    })
    await expect(promise).rejects.toEqual(
      expect.objectContaining<Partial<InsuranceActionError>>({
        message: '请检查投保人信息',
        fieldErrors: { mobile: '手机号格式错误' },
      }),
    )
  })
})
