import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

export const INSURANCE_CATALOG_ID = 'tazhive.insurance.v1'
export const INSURANCE_SUBMIT_ACTION = 'insurance.submit'

const INSURANCE_INTENT_PATTERN = /买(?:一份)?保险|购买保险|投保/

interface InsuranceCardEnvelope {
  readonly surfaceId: string
  readonly commands: readonly XAgentCommand_v0_9[]
}

// 识别本地演示支持的投保意图，普通消息继续交给远端模型处理。
export function isInsuranceIntent(text: string): boolean {
  return INSURANCE_INTENT_PATTERN.test(text)
}

// 生成一套完整的 A2UI v0.9 命令，模拟业务后端返回的动态表单协议。
export function createInsuranceCardEnvelope(surfaceId: string): InsuranceCardEnvelope {
  const commands: XAgentCommand_v0_9[] = [
    {
      version: 'v0.9',
      createSurface: { surfaceId, catalogId: INSURANCE_CATALOG_ID },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [
          {
            id: 'root',
            component: 'InsuranceForm',
            children: ['title', 'description', 'name', 'birthDate', 'gender', 'phone', 'submit'],
          },
          { id: 'title', component: 'Text', text: '填写投保人信息', variant: 'title' },
          {
            id: 'description',
            component: 'Text',
            text: '请填写以下信息，我们将为你生成投保方案。',
            variant: 'description',
          },
          {
            id: 'name',
            component: 'TextField',
            name: 'name',
            label: '姓名',
            placeholder: '请输入姓名',
            value: { path: '/insurance/name' },
            bindingPath: 'insurance/name',
            minLength: 2,
            maxLength: 30,
          },
          {
            id: 'birthDate',
            component: 'DateField',
            name: 'birthDate',
            label: '出生日期',
            value: { path: '/insurance/birthDate' },
            bindingPath: 'insurance/birthDate',
          },
          {
            id: 'gender',
            component: 'GenderField',
            name: 'gender',
            label: '性别',
            value: { path: '/insurance/gender' },
            bindingPath: 'insurance/gender',
            options: [
              { label: '男', value: 'male' },
              { label: '女', value: 'female' },
            ],
          },
          {
            id: 'phone',
            component: 'TextField',
            name: 'phone',
            label: '手机号',
            placeholder: '请输入中国大陆手机号',
            value: { path: '/insurance/phone' },
            bindingPath: 'insurance/phone',
            pattern: '^1[3-9]\\d{9}$',
          },
          {
            id: 'submit',
            component: 'SubmitButton',
            text: '提交投保信息',
            action: {
              event: {
                name: INSURANCE_SUBMIT_ACTION,
                context: { insurance: { path: '/insurance' } },
              },
            },
          },
        ],
      },
    },
    {
      version: 'v0.9',
      updateDataModel: {
        surfaceId,
        path: '/insurance',
        value: { name: '', birthDate: '', gender: '', phone: '' },
      },
    },
  ]

  return { surfaceId, commands }
}

// 使用围栏模拟聊天接口返回字符串，未来可直接替换为后端的同形响应。
export function createInsuranceMockReply(surfaceId: string): string {
  return '```a2ui\n' + JSON.stringify(createInsuranceCardEnvelope(surfaceId)) + '\n```'
}
