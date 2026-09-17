import { createContext, useContext } from 'react'
import type { FormInstance } from 'antd'

const InsuranceFormInstanceContext = createContext<FormInstance | null>(null)

export const InsuranceFormInstanceProvider = InsuranceFormInstanceContext.Provider

/**
 * 读取当前投保步骤共享的 Ant Design 表单实例。
 * 后端 A2UI 组件树中提交按钮、只读摘要与 InsuranceForm 是兄弟节点，
 * 表单实例由步骤布局层创建并广播，保证 Form 内外的组件都能校验同一份数据。
 */
export function useInsuranceFormInstance(): FormInstance | null {
  return useContext(InsuranceFormInstanceContext)
}
