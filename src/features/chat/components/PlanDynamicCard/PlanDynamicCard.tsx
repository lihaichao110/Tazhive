import { useEffect, useRef } from 'react'
import { XCard, type ActionPayload } from '@ant-design/x-card'

import { ALLOWED_PLAN_ACTIONS } from '../../model/planCard'
import type { DynamicCardMessageContent } from '../../model/types'
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
import './planCatalog'

interface PlanDynamicCardProps {
  readonly card: DynamicCardMessageContent
}

const COMPONENTS = { PlanList, PlanCard, PlanImage, PlanPoints, PlanActions, PlanActionButton }

// 承接 XCard Action 边界，只允许当前方案 catalog 声明的动作进入聊天会话。
export function PlanDynamicCard({ card }: PlanDynamicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { submitCardAction } = useChatSessionActions()
  const onReady = useDynamicCardHost()

  useEffect(() => {
    const element = cardRef.current
    if (element) onReady(card.surfaceId, element)
  }, [card.surfaceId, onReady])

  const handleAction = (payload: ActionPayload): void => {
    if (!ALLOWED_PLAN_ACTIONS.has(payload.name) || payload.surfaceId !== card.surfaceId) return
    submitCardAction({
      name: payload.name,
      surfaceId: payload.surfaceId,
      context: payload.context,
    })
  }

  return (
    <div ref={cardRef} data-dynamic-card={card.surfaceId}>
      <XCard.Box commands={[...card.commands]} components={COMPONENTS} onAction={handleAction}>
        <XCard.Card id={card.surfaceId} />
      </XCard.Box>
    </div>
  )
}
