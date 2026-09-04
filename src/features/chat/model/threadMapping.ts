import type { ThreadRead } from '../api/listThreads'
import type { ConversationSummary } from './conversationStore'

// 后端未提供摘要字段，列表项在生成首条消息前统一展示该占位文案。
const EMPTY_PREVIEW = '暂无消息'

// 标题为 null 表示尚未生成标题，侧边栏展示兜底文案。
const UNTITLED_TITLE = '新对话'

// 今年的会话省略年份，跨年会话附带年份便于区分。
const fullDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })

// 将服务端时间格式化为侧边栏展示文本；无效时间回退为空串避免渲染 Invalid Date。
function formatUpdatedAt(updatedAt: string): string {
  const parsedDate = new Date(updatedAt)
  if (Number.isNaN(parsedDate.getTime())) return ''
  const formatter =
    parsedDate.getFullYear() === new Date().getFullYear() ? shortDateFormatter : fullDateFormatter
  return formatter.format(parsedDate)
}

// 将 GET /api/v1/threads 的响应映射为侧边栏会话摘要，字段缺失时使用兜底值。
export function mapThreadsToConversations(threads: readonly ThreadRead[]): ConversationSummary[] {
  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title ?? UNTITLED_TITLE,
    preview: EMPTY_PREVIEW,
    updatedAt: formatUpdatedAt(thread.updated_at),
  }))
}
