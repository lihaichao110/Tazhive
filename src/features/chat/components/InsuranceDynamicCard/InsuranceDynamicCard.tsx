import { useEffect, useRef } from 'react'
import { XCard, type ActionPayload } from '@ant-design/x-card'

import type {
  DynamicCardMessageContent,
  DynamicCardReadyHandler,
  InsuranceSubmission,
} from '../../model/types'
import { isValidInsuranceSubmission } from '../../model/insuranceValidation'
import {
  InsuranceDateField,
  InsuranceForm,
  InsuranceGenderField,
  InsuranceSubmitButton,
  InsuranceText,
  InsuranceTextField,
} from './InsuranceFields'
import './insuranceCatalog'

interface InsuranceDynamicCardProps {
  readonly card: DynamicCardMessageContent
  readonly onReady?: DynamicCardReadyHandler
  readonly onSubmit: (submission: InsuranceSubmission) => void
}

const COMPONENTS = {
  InsuranceForm,
  Text: InsuranceText,
  TextField: InsuranceTextField,
  DateField: InsuranceDateField,
  GenderField: InsuranceGenderField,
  SubmitButton: InsuranceSubmitButton,
}

function isInsuranceSubmission(value: unknown): value is InsuranceSubmission {
  if (typeof value !== 'object' || value === null) return false
  const submission = value as Record<string, unknown>
  if (
    typeof submission.name !== 'string' ||
    typeof submission.birthDate !== 'string' ||
    (submission.gender !== 'male' && submission.gender !== 'female') ||
    typeof submission.phone !== 'string'
  ) {
    return false
  }
  return isValidInsuranceSubmission({
    name: submission.name,
    birthDate: submission.birthDate,
    gender: submission.gender,
    phone: submission.phone,
  })
}

// 承接 XCard Action 边界，只把完整且合法的投保信息交给聊天业务层。
export function InsuranceDynamicCard({ card, onReady, onSubmit }: InsuranceDynamicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // 卡片完成首次挂载后只上报定位元素，具体滚动策略由页面层统一决定。
  useEffect(() => {
    const element = cardRef.current
    if (element) onReady?.(card.surfaceId, element)
  }, [card.surfaceId, onReady])

  const handleAction = (payload: ActionPayload): void => {
    const insurance = payload.context.insurance
    if (payload.name === 'insurance.submit' && isInsuranceSubmission(insurance)) {
      onSubmit(insurance)
    }
  }

  return (
    <div ref={cardRef} data-dynamic-card={card.surfaceId}>
      <XCard.Box commands={[...card.commands]} components={COMPONENTS} onAction={handleAction}>
        <XCard.Card id={card.surfaceId} />
      </XCard.Box>
    </div>
  )
}
