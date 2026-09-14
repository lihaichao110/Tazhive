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
  },
}

registerCatalog(PLAN_CATALOG)
