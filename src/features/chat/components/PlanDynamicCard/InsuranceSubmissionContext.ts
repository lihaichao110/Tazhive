import { createContext, useContext } from 'react'

interface InsuranceSubmissionState {
  readonly isSubmitting: boolean
}

const InsuranceSubmissionContext = createContext<InsuranceSubmissionState>({ isSubmitting: false })

export const InsuranceSubmissionProvider = InsuranceSubmissionContext.Provider

// 让 A2UI 深层提交按钮读取卡片级请求状态，避免沿组件树透传业务状态。
export function useInsuranceSubmission(): InsuranceSubmissionState {
  return useContext(InsuranceSubmissionContext)
}
