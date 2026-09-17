import { useEffect, useMemo, useRef, useState } from 'react'
import { XCard, type ActionPayload, type XAgentCommand_v0_9 } from '@ant-design/x-card'

import {
  InsuranceActionError,
  normalizeInsuranceActionContext,
} from '../../api/submitInsuranceAction'
import { isStaleInsuranceFormCard } from '../../model/insuranceCardProgress'
import { ALLOWED_INSURANCE_ACTIONS, PLAN_PRE_UNDERWRITE_ACTION } from '../../model/planCard'
import type { DynamicCardMessageContent, InsuranceActionPayload } from '../../model/types'
import { useChatSession } from '../../providers/useChatSession'
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
  InsuranceGenderRadio,
  InsuranceInput,
  InsurancePlanSummary,
  InsuranceRelationshipSelect,
  InsuranceStepIndicator,
  InsuranceStepLayout,
  InsuranceSubmitButton,
} from './InsuranceComponents'
import { InsuranceSubmissionProvider } from './InsuranceSubmissionContext'
import './planCatalog'
import styles from './PlanDynamicCard.module.scss'

interface PlanDynamicCardProps {
  readonly card: DynamicCardMessageContent
}

interface DataModelUpdate {
  readonly path: string
  readonly value: unknown
}

// 为历史陈旧保险卡片追加 submitted 锁：字段与提交按钮全部禁用。
// 历史消息可能保留已被后续步骤超越的旧表单命令，仅靠命令原始状态会重新渲染为可编辑。
function withStaleCardLock(
  commands: readonly XAgentCommand_v0_9[],
  surfaceId: string,
  locked: boolean,
): readonly XAgentCommand_v0_9[] {
  if (!locked) return commands
  return [
    ...commands,
    {
      version: 'v0.9',
      updateDataModel: { surfaceId, path: '/ui', value: { submitted: true } },
    },
  ]
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
  InsuranceGenderRadio,
  InsuranceConsent,
  InsuranceRelationshipSelect,
  InsuranceSubmitButton,
  InsurancePlanSummary,
  InsuranceCompletion,
}

// 承接 XCard Action 边界，只允许当前方案 catalog 声明的动作进入聊天会话。
export function PlanDynamicCard({ card }: PlanDynamicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { messages, submitCardAction, submitInsuranceAction } = useChatSession()
  const onReady = useDynamicCardHost()
  // 陈旧保险卡片 = 消息列表中已被更大步骤超越的旧表单；仅最新步骤可操作。
  const isStaleCard = useMemo(() => isStaleInsuranceFormCard(card, messages), [card, messages])
  const [runtimeCommands, setRuntimeCommands] = useState<readonly XAgentCommand_v0_9[]>(() =>
    withStaleCardLock(card.commands, card.surfaceId, isStaleCard),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const actionInFlightRef = useRef(false)
  const insuranceEventIdRef = useRef<string | null>(null)
  const latestCommandsRef = useRef(card.commands)
  latestCommandsRef.current = card.commands
  const commandSignature = JSON.stringify(card.commands)

  useEffect(() => {
    const element = cardRef.current
    if (element) onReady(card.surfaceId, element)
  }, [card.surfaceId, onReady])

  // 服务端以稳定消息 ID 原地更新步骤时，用最新命令替换旧卡片运行态；
  // 消息列表推进使本卡变为陈旧时（如服务端按步骤追加新卡片消息），同样保持禁用锁。
  useEffect(() => {
    setRuntimeCommands(withStaleCardLock(latestCommandsRef.current, card.surfaceId, isStaleCard))
    insuranceEventIdRef.current = null
  }, [card.surfaceId, commandSignature, isStaleCard])

  const updateDataModel = (updates: readonly DataModelUpdate[]): void => {
    const commands: XAgentCommand_v0_9[] = updates.map(({ path, value }) => ({
      version: 'v0.9',
      updateDataModel: { surfaceId: card.surfaceId, path, value },
    }))
    setRuntimeCommands((current) => [...current, ...commands])
  }

  // 预核保继续走聊天；正式投保及表单动作走确定性接口并原地显示校验结果。
  const handleAction = (payload: ActionPayload): void => {
    if (payload.surfaceId !== card.surfaceId || actionInFlightRef.current) return
    // 陈旧保险卡片一律拒绝动作，防止绕过禁用 UI 对已过期的步骤重复提交。
    if (isStaleCard) return
    if (payload.name === PLAN_PRE_UNDERWRITE_ACTION) {
      submitCardAction({
        name: payload.name,
        surfaceId: payload.surfaceId,
        context: payload.context,
      })
      return
    }
    if (!ALLOWED_INSURANCE_ACTIONS.has(payload.name)) return
    const normalizedContext = normalizeInsuranceActionContext(payload.context)
    const form = normalizedContext.form
    const formSnapshot =
      form && typeof form === 'object' && !Array.isArray(form)
        ? { ...(form as Readonly<Record<string, unknown>>) }
        : null
    const restoreForm = formSnapshot
      ? [{ path: '/form', value: formSnapshot } satisfies DataModelUpdate]
      : []
    actionInFlightRef.current = true
    setIsSubmitting(true)
    insuranceEventIdRef.current ??= crypto.randomUUID()
    updateDataModel([...restoreForm, { path: '/errors', value: {} }])
    void submitInsuranceAction({
      ...(payload as InsuranceActionPayload),
      context: normalizedContext,
      eventId: insuranceEventIdRef.current,
    })
      .then(() => {
        insuranceEventIdRef.current = null
        // 成功后保留 /form 已填数据供客户回看，字段禁用由 /ui/submitted 承担；
        // 后续步骤由服务端命令原地替换并重置数据模型，不依赖客户端清空。
        updateDataModel([
          { path: '/errors', value: {} },
          { path: '/ui/submitted', value: true },
        ])
      })
      .catch((error: unknown) => {
        const fieldErrors = error instanceof InsuranceActionError ? error.fieldErrors : {}
        const message = error instanceof Error ? error.message : '提交失败，请稍后重试'
        updateDataModel([
          ...restoreForm,
          {
            path: '/errors',
            value: Object.keys(fieldErrors).length ? fieldErrors : { form: message },
          },
        ])
      })
      .finally(() => {
        actionInFlightRef.current = false
        setIsSubmitting(false)
      })
  }

  return (
    <div ref={cardRef} data-dynamic-card={card.surfaceId} className={styles.cardContainer}>
      <XCard.Box commands={[...runtimeCommands]} components={COMPONENTS} onAction={handleAction}>
        <InsuranceSubmissionProvider value={{ isSubmitting }}>
          <XCard.Card id={card.surfaceId} />
        </InsuranceSubmissionProvider>
      </XCard.Box>
    </div>
  )
}
