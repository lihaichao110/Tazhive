/** 方案动态卡片使用的 A2UI v0.9 基础组件目录标识。 */
export const PLAN_CATALOG_ID = 'https://a2ui.org/specification/v0_9/basic_catalog.json'

/** 将用户选择的方案提交给模型继续执行预核保的动作名。 */
export const PLAN_PRE_UNDERWRITE_ACTION = 'plan_pre_underwrite'

/** 从方案推荐进入确定性投保流程的动作名。 */
export const PLAN_APPLY_ACTION = 'plan_apply'

/** 提交投保人资料并推进投保步骤的动作名。 */
export const APPLICANT_SUBMIT_ACTION = 'applicant_submit'

/** 提交被保人资料并推进投保步骤的动作名。 */
export const INSURED_SUBMIT_ACTION = 'insured_submit'

/** 确认投保方案及资料，完成投保流程的动作名。 */
export const PLAN_CONFIRM_ACTION = 'plan_confirm'

/**
 * 后端 A2UI 响应允许实例化的业务组件白名单。
 * 解析阶段会拒绝名单外的组件，避免模型注入未注册或非预期的界面能力。
 */
export const ALLOWED_PLAN_COMPONENTS = new Set([
  'PlanList',
  'PlanCard',
  'PlanImage',
  'PlanPoints',
  'PlanActions',
  'PlanActionButton',
  'InsuranceStepLayout',
  'InsuranceStepIndicator',
  'InsuranceForm',
  'InsuranceFormError',
  'InsuranceInput',
  'InsuranceConsent',
  'InsuranceRelationshipSelect',
  'InsuranceGenderRadio',
  'InsuranceSubmitButton',
  'InsurancePlanSummary',
  'InsuranceCompletion',
])

/** 可编码进聊天消息、交由模型继续处理的方案卡片动作。 */
export const ALLOWED_PLAN_ACTIONS = new Set([PLAN_PRE_UNDERWRITE_ACTION, PLAN_APPLY_ACTION])

/** 可提交到确定性投保接口并在当前卡片内推进状态的动作。 */
export const ALLOWED_INSURANCE_ACTIONS = new Set([
  PLAN_APPLY_ACTION,
  APPLICANT_SUBMIT_ACTION,
  INSURED_SUBMIT_ACTION,
  PLAN_CONFIRM_ACTION,
])
