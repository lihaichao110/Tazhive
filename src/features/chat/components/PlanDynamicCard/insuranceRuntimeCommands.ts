import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

/** 提交成功时记录的表单快照：form 为提交瞬间的字段值，step 为当时的流程步骤号。 */
export interface SubmittedSnapshot {
  readonly form: Readonly<Record<string, unknown>> | null
  readonly step: number | null
}

function dataCommand(surfaceId: string, path: string, value: unknown): XAgentCommand_v0_9 {
  return { version: 'v0.9', updateDataModel: { surfaceId, path, value } }
}

// 为历史陈旧保险卡片追加 submitted 锁：字段与提交按钮全部禁用。
// 历史消息可能保留已被后续步骤超越的旧表单命令，仅靠命令原始状态会重新渲染为可编辑。
export function withStaleCardLock(
  commands: readonly XAgentCommand_v0_9[],
  surfaceId: string,
  locked: boolean,
): readonly XAgentCommand_v0_9[] {
  if (!locked) return commands
  return [...commands, dataCommand(surfaceId, '/ui', { submitted: true })]
}

/**
 * 在命令尾部回填已提交快照：服务端命令固定携带空表单种子与 submitted=false，
 * 运行时命令以服务端命令重置后重放会清掉 /form，必须在尾部补回快照与提交锁，
 * 已提交卡片才能保留客户回看数据并维持禁用。仅限快照步骤与当前命令步骤相同的场景，
 * 同 surface 推进到新步骤时由调用方作废快照，保证新步骤表单从空种子开始。
 */
export function withSubmittedSnapshot(
  commands: readonly XAgentCommand_v0_9[],
  surfaceId: string,
  snapshot: SubmittedSnapshot | null,
): readonly XAgentCommand_v0_9[] {
  if (!snapshot) return commands
  const restore = snapshot.form ? [dataCommand(surfaceId, '/form', snapshot.form)] : []
  return [...commands, ...restore, dataCommand(surfaceId, '/ui/submitted', true)]
}
