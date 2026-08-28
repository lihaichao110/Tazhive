import { registerCatalog, type Catalog } from '@ant-design/x-card'

import { INSURANCE_CATALOG_ID } from '../../model/insuranceCard'

const stringProperty = { type: 'string' } as const

// Catalog 只声明本业务允许下发的组件与属性，作为动态 UI 的安全边界。
export const INSURANCE_CATALOG: Catalog = {
  catalogId: INSURANCE_CATALOG_ID,
  title: '投保人信息表单',
  components: {
    InsuranceForm: { type: 'object', properties: {} },
    Text: {
      type: 'object',
      properties: { text: stringProperty, variant: stringProperty },
      required: ['text'],
    },
    TextField: {
      type: 'object',
      properties: {
        name: stringProperty,
        label: stringProperty,
        placeholder: stringProperty,
        value: stringProperty,
        bindingPath: stringProperty,
        minLength: { type: 'number' },
        maxLength: { type: 'number' },
        pattern: stringProperty,
      },
      required: ['name', 'label', 'bindingPath'],
    },
    DateField: {
      type: 'object',
      properties: {
        name: stringProperty,
        label: stringProperty,
        value: stringProperty,
        bindingPath: stringProperty,
      },
      required: ['name', 'label', 'bindingPath'],
    },
    GenderField: {
      type: 'object',
      properties: {
        name: stringProperty,
        label: stringProperty,
        value: stringProperty,
        bindingPath: stringProperty,
        options: { type: 'array' },
      },
      required: ['name', 'label', 'bindingPath', 'options'],
    },
    SubmitButton: {
      type: 'object',
      properties: { text: stringProperty, action: { type: 'object' } },
      required: ['text', 'action'],
    },
  },
}

registerCatalog(INSURANCE_CATALOG)
