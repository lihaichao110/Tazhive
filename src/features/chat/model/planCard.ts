export const PLAN_CATALOG_ID = 'https://a2ui.org/specification/v0_9/basic_catalog.json'
export const PLAN_PRE_UNDERWRITE_ACTION = 'plan_pre_underwrite'
export const PLAN_APPLY_ACTION = 'plan_apply'

export const ALLOWED_PLAN_COMPONENTS = new Set([
  'PlanList',
  'PlanCard',
  'PlanImage',
  'PlanPoints',
  'PlanActions',
  'PlanActionButton',
])

export const ALLOWED_PLAN_ACTIONS = new Set([PLAN_PRE_UNDERWRITE_ACTION, PLAN_APPLY_ACTION])
