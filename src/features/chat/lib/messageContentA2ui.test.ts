import { describe, expect, it } from 'vitest'

import { PLAN_CATALOG_ID } from '../model/planCard'
import { parseAssistantMessageContent } from './messageContent'

function createPlanReply(surfaceId: string): string {
  return `\`\`\`a2ui\n${JSON.stringify({
    surfaceId,
    commands: [
      { version: 'v0.9', createSurface: { surfaceId, catalogId: PLAN_CATALOG_ID } },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId,
          components: [
            { id: 'root', component: 'PlanList', children: ['plan-1', 'plan-2'] },
            {
              id: 'plan-1',
              component: 'PlanCard',
              groupCode: 'G001',
              groupName: '安心保',
              title: '方案一',
              hasSale: true,
            },
            {
              id: 'plan-2',
              component: 'PlanCard',
              groupCode: 'G002',
              groupName: '无忧保',
              title: '方案二',
              hasSale: false,
            },
          ],
        },
      },
    ],
  })}\n\`\`\``
}

// 投保人表单卡使用 InsuranceGenderRadio，守护解析白名单与运行时 catalog 的组件名同步。
function createApplicantFormReply(surfaceId: string): string {
  return `\`\`\`a2ui\n${JSON.stringify({
    surfaceId,
    commands: [
      { version: 'v0.9', createSurface: { surfaceId, catalogId: PLAN_CATALOG_ID } },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId,
          components: [
            { id: 'root', component: 'InsuranceStepLayout', children: ['form'] },
            { id: 'form', component: 'InsuranceForm', children: ['field_gender'] },
            {
              id: 'field_gender',
              component: 'InsuranceGenderRadio',
              label: '性别',
              bindingPath: 'form/gender',
              options: [
                { label: '男', value: 'MALE' },
                { label: '女', value: 'FEMALE' },
              ],
            },
          ],
        },
      },
      { version: 'v0.9', updateDataModel: { surfaceId, path: '/form', value: {} } },
    ],
  })}\n\`\`\``
}

describe('A2UI 消息解析', () => {
  it('将包含多张方案的 v0.9 围栏解析为动态卡片', () => {
    const content = parseAssistantMessageContent(createPlanReply('plans-test'))

    expect(content).toHaveLength(1)
    expect(content[0]).toMatchObject({
      type: 'dynamic-card',
      surfaceId: 'plans-test',
      commands: expect.arrayContaining([expect.objectContaining({ version: 'v0.9' })]),
    })
  })

  it('将含 InsuranceGenderRadio 的投保表单围栏解析为动态卡片', () => {
    const content = parseAssistantMessageContent(
      createApplicantFormReply('insurance_apply-test_applicant'),
    )

    expect(content).toHaveLength(1)
    expect(content[0]).toMatchObject({
      type: 'dynamic-card',
      surfaceId: 'insurance_apply-test_applicant',
    })
  })

  it.each([
    '```a2ui\n{broken}\n```',
    '```a2ui\n{"surfaceId":"bad","commands":[{"version":"v0.8"}]}\n```',
    '```a2ui\n{"surfaceId":"bad","commands":[{"version":"v0.9","updateComponents":{"surfaceId":"bad","components":[{"id":"root","component":"Script"}]}}]}\n```',
    '```a2ui\n{"surfaceId":"bad","commands":[{"version":"v0.9","createSurface":{"surfaceId":"other","catalogId":"https://a2ui.org/specification/v0_9/basic_catalog.json"}},{"version":"v0.9","updateComponents":{"surfaceId":"bad","components":[]}}]}\n```',
    '```a2ui\n{"surfaceId":"bad","commands":[{"version":"v0.9","createSurface":{"surfaceId":"bad","catalogId":"unknown"}}]}\n```',
  ])('非法或越权的 A2UI 数据安全降级', (rawContent) => {
    expect(parseAssistantMessageContent(rawContent)).toEqual([
      { type: 'dynamic-card-error', message: '方案卡片暂时无法加载，请稍后重试。' },
    ])
  })
})
