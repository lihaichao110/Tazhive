import { useEffect, useRef, useState } from 'react'
import { XCard, type ActionPayload, type XAgentCommand_v0_9 } from '@ant-design/x-card'

import { InsuranceActionError } from '../../api/submitInsuranceAction'
import { ALLOWED_INSURANCE_ACTIONS, PLAN_PRE_UNDERWRITE_ACTION } from '../../model/planCard'
import type { DynamicCardMessageContent, InsuranceActionPayload } from '../../model/types'
import { useChatSessionActions } from '../../providers/useChatSession'
import { useDynamicCardHost } from '../../providers/useDynamicCardHost'
import {
  PlanActionButton,
  PlanActions,
  PlanCard,
  PlanImage,
  PlanList,
  PlanPoints,
} from './PlanComponents'
import {
  InsuranceCompletion,
  InsuranceConsent,
  InsuranceForm,
  InsuranceFormError,
  InsuranceInput,
  InsurancePlanSummary,
  InsuranceRelationshipSelect,
  InsuranceSameApplicantHint,
  InsuranceStepIndicator,
  InsuranceStepLayout,
  InsuranceSubmitButton,
} from './InsuranceComponents'
import './planCatalog'
import styles from './PlanDynamicCard.module.scss'

interface PlanDynamicCardProps {
  readonly card: DynamicCardMessageContent
}

const COMPONENTS = {
  PlanList,
  PlanCard,
  PlanImage,
  PlanPoints,
  PlanActions,
  PlanActionButton,
  InsuranceStepLayout,
  InsuranceStepIndicator,
  InsuranceForm,
  InsuranceFormError,
  InsuranceInput,
  InsuranceConsent,
  InsuranceRelationshipSelect,
  InsuranceSameApplicantHint,
  InsuranceSubmitButton,
  InsurancePlanSummary,
  InsuranceCompletion,
}

// 承接 XCard Action 边界，只允许当前方案 catalog 声明的动作进入聊天会话。
export function PlanDynamicCard({ card }: PlanDynamicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { submitCardAction, submitInsuranceAction } = useChatSessionActions()
  const onReady = useDynamicCardHost()
  const [runtimeCommands, setRuntimeCommands] = useState<readonly XAgentCommand_v0_9[]>(
    card.commands,
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const actionInFlightRef = useRef(false)
  const insuranceEventIdRef = useRef<string | null>(null)

  useEffect(() => {
    const element = cardRef.current
    if (element) onReady(card.surfaceId, element)
  }, [card.surfaceId, onReady])

  const updateDataModel = (path: string, value: unknown): void => {
    setRuntimeCommands((current) => [
      ...current,
      { version: 'v0.9', updateDataModel: { surfaceId: card.surfaceId, path, value } },
    ])
  }

  // 预核保继续走聊天；正式投保及表单动作走确定性接口并原地显示校验结果。
  const handleAction = (payload: ActionPayload): void => {
    if (payload.surfaceId !== card.surfaceId || actionInFlightRef.current) return
    if (payload.name === PLAN_PRE_UNDERWRITE_ACTION) {
      submitCardAction({
        name: payload.name,
        surfaceId: payload.surfaceId,
        context: payload.context,
      })
      return
    }
    if (!ALLOWED_INSURANCE_ACTIONS.has(payload.name)) return
    actionInFlightRef.current = true
    insuranceEventIdRef.current ??= crypto.randomUUID()
    setActionError(null)
    updateDataModel('/errors', {})
    void submitInsuranceAction({
      ...(payload as InsuranceActionPayload),
      eventId: insuranceEventIdRef.current,
    })
      .then(() => {
        updateDataModel('/ui/submitted', true)
        updateDataModel('/ui/person_fields_disabled', true)
      })
      .catch((error: unknown) => {
        const fieldErrors = error instanceof InsuranceActionError ? error.fieldErrors : {}
        const message = error instanceof Error ? error.message : '提交失败，请稍后重试'
        updateDataModel(
          '/errors',
          Object.keys(fieldErrors).length ? fieldErrors : { form: message },
        )
        setActionError(message)
      })
      .finally(() => {
        actionInFlightRef.current = false
      })
  }

  return (
    <div ref={cardRef} data-dynamic-card={card.surfaceId} className={styles.cardContainer}>
      <XCard.Box commands={[...runtimeCommands]} components={COMPONENTS} onAction={handleAction}>
        <XCard.Card id={card.surfaceId} />
      </XCard.Box>
      {actionError ? (
        <p className={styles.actionError} role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  )
}
