import { registerCatalog, type Catalog } from '@ant-design/x-card'

import { PLAN_CATALOG_ID } from '../../model/planCard'

const stringProperty = { type: 'string' } as const

// 与后端 plan_show 命令构造器保持一致，catalog 同时构成动态组件属性白名单。
export const PLAN_CATALOG: Catalog = {
  catalogId: PLAN_CATALOG_ID,
  title: '保险方案列表',
  components: {
    PlanList: { type: 'object', properties: {} },
    PlanCard: {
      type: 'object',
      properties: {
        groupCode: stringProperty,
        groupName: stringProperty,
        title: stringProperty,
        hasSale: { type: 'boolean' },
      },
      required: ['groupCode', 'groupName', 'title'],
    },
    PlanImage: {
      type: 'object',
      properties: { url: stringProperty, altText: stringProperty },
      required: ['url', 'altText'],
    },
    PlanPoints: {
      type: 'object',
      properties: { items: { type: 'array' } },
      required: ['items'],
    },
    PlanActions: { type: 'object', properties: {} },
    PlanActionButton: {
      type: 'object',
      properties: {
        text: stringProperty,
        backgroundColor: stringProperty,
        color: stringProperty,
        borderRadius: stringProperty,
        action: { type: 'object' },
      },
      required: ['text', 'action'],
    },
    InsuranceStepLayout: { type: 'object', properties: {} },
    InsuranceStepIndicator: {
      type: 'object',
      properties: { current: { type: 'number' }, total: { type: 'number' }, title: stringProperty },
      required: ['current', 'total', 'title'],
    },
    InsuranceForm: { type: 'object', properties: {} },
    InsuranceFormError: {
      type: 'object',
      properties: { message: stringProperty },
    },
    InsuranceInput: {
      type: 'object',
      properties: {
        field: stringProperty,
        label: stringProperty,
        inputType: stringProperty,
        placeholder: stringProperty,
        autocomplete: stringProperty,
        bindingPath: stringProperty,
        value: stringProperty,
        error: stringProperty,
        disabled: { type: 'boolean' },
      },
      required: ['field', 'label', 'bindingPath'],
    },
    InsuranceConsent: {
      type: 'object',
      properties: {
        text: stringProperty,
        bindingPath: stringProperty,
        checked: { type: 'boolean' },
        error: stringProperty,
        disabled: { type: 'boolean' },
      },
      required: ['text', 'bindingPath'],
    },
    InsuranceRelationshipSelect: {
      type: 'object',
      properties: {
        label: stringProperty,
        bindingPath: stringProperty,
        value: stringProperty,
        error: stringProperty,
        disabled: { type: 'boolean' },
        options: { type: 'array' },
      },
      required: ['label', 'bindingPath', 'options'],
    },
    InsuranceSameApplicantHint: {
      type: 'object',
      properties: {
        name: stringProperty,
        mobile: stringProperty,
        visible: { type: 'boolean' },
      },
      required: ['name', 'mobile'],
    },
    InsuranceSubmitButton: {
      type: 'object',
      properties: {
        text: stringProperty,
        disabled: { type: 'boolean' },
        action: { type: 'object' },
      },
      required: ['text', 'action'],
    },
    InsurancePlanSummary: {
      type: 'object',
      properties: {
        groupName: stringProperty,
        title: stringProperty,
        insurList: { type: 'array' },
        applicant: { type: 'object' },
        insured: { type: 'object' },
        relationship: stringProperty,
      },
      required: ['groupName', 'title', 'insurList', 'applicant', 'insured', 'relationship'],
    },
    InsuranceCompletion: {
      type: 'object',
      properties: { applicationId: stringProperty },
      required: ['applicationId'],
    },
  },
}

registerCatalog(PLAN_CATALOG)
