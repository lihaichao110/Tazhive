import type { XAgentCommand_v0_9 } from '@ant-design/x-card'

/** 消息发送方；用于决定消息布局、样式及可用交互。 */
export type ChatRole = 'user' | 'assistant'

/** 对话推理模式：快速回答或启用深度思考。 */
export type ChatMode = 'fast' | 'deep'

/**
 * 消息在 SDK 生命周期中的状态。
 * `local` 表示仅存在于本地，`loading`/`updating` 表示正在接收响应，
 * 其余状态分别表示成功、失败或被主动中止。
 */
export type ChatMessageStatus = 'local' | 'loading' | 'updating' | 'success' | 'error' | 'abort'

/** 用户发送新问题时附带的原消息选中文本。 */
export interface ChatQuote {
  /** 被引用消息的唯一标识。 */
  readonly messageId: string
  /** 被引用消息的发送方。 */
  readonly role: ChatRole
  /** 用户从原消息中选中的引用文本。 */
  readonly text: string
}

/** 普通 Markdown 文本内容块。 */
export interface TextMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'text'
  /** 待展示的 Markdown 源文本。 */
  readonly text: string
}

/** 模型思考过程内容块。 */
export interface ThinkingMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'thinking'
  /** 从模型思考协议段中提取的文本。 */
  readonly text: string
  /** 思考协议段是否已经收到闭合标记。 */
  readonly completed: boolean
}

/** Mermaid 图表源码内容块。 */
export interface MermaidMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'mermaid'
  /** 交给 Mermaid 渲染器处理的图表源码。 */
  readonly source: string
}

/** 聊天响应协议当前支持的统计图表类型。 */
export type ResponseChartType = 'pie' | 'bar' | 'line'

/** 图表中的单个分类及其数值。 */
export interface ResponseChartDatum {
  /** 分类名称，用作饼图名称或坐标轴标签。 */
  readonly name: string
  /** 分类对应的有限数值。 */
  readonly value: number
}

/** 模型响应携带的完整图表配置。 */
export interface ResponseChart {
  /** 图表唯一标识，用于关联正文中的 `{{chart:id}}` 占位符。 */
  readonly chartId: string
  /** 决定前端采用的图表渲染方式。 */
  readonly type: ResponseChartType
  /** 展示在图表上方的标题。 */
  readonly title: string
  /** 图表的分类数值集合。 */
  readonly data: readonly ResponseChartDatum[]
}

/** 已通过协议校验、可以渲染的图表内容块。 */
export interface ChartMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'chart'
  /** 传给图表组件的结构化配置。 */
  readonly chart: ResponseChart
}

/** 图表引用缺失或配置非法时展示的降级内容块。 */
export interface ChartErrorMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'chart-error'
  /** 面向用户展示的图表加载失败提示。 */
  readonly message: string
}

/** 已通过白名单校验、可以交给 XCard 运行时执行的动态卡片内容块。 */
export interface DynamicCardMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'dynamic-card'
  /** 本张卡片的 A2UI Surface 标识，也是所有命令的作用域。 */
  readonly surfaceId: string
  /** 创建 Surface、更新组件或数据模型的 A2UI v0.9 命令序列。 */
  readonly commands: readonly XAgentCommand_v0_9[]
}

/** A2UI 协议或组件校验失败时展示的降级内容块。 */
export interface DynamicCardErrorMessageContent {
  /** 内容块判别字段。 */
  readonly type: 'dynamic-card-error'
  /** 面向用户展示的卡片加载失败提示。 */
  readonly message: string
}

/** XCard 交互动作进入聊天业务层时使用的统一载荷。 */
export interface CardActionPayload {
  /** 组件触发的动作名，由对应动作白名单约束。 */
  readonly name: string
  /** 触发动作的 A2UI Surface 标识。 */
  readonly surfaceId: string
  /** 卡片随动作提交的业务上下文，例如方案名称或投保申请信息。 */
  readonly context: Readonly<Record<string, unknown>>
}

/** 确定性投保接口允许处理的动作名。 */
export type InsuranceActionName =
  'plan_apply' | 'applicant_submit' | 'insured_submit' | 'plan_confirm'

/** 提交到投保接口的卡片动作载荷。 */
export interface InsuranceActionPayload extends CardActionPayload {
  /** 将通用动作名收窄为投保流程支持的动作。 */
  readonly name: InsuranceActionName
  /** 同一张卡片的网络重试复用事件 ID，保证服务端幂等。 */
  readonly eventId?: string
}

/**
 * 单条聊天消息可包含的内容块联合类型。
 * 渲染层通过各成员的 `type` 字段选择对应展示组件。
 */
export type ChatMessageContent =
  | TextMessageContent
  | ThinkingMessageContent
  | MermaidMessageContent
  | ChartMessageContent
  | ChartErrorMessageContent
  | DynamicCardMessageContent
  | DynamicCardErrorMessageContent

/** 聊天界面使用的领域消息模型。 */
export interface ChatMessage {
  /** 消息唯一标识，用于列表渲染、引用和消息操作。 */
  readonly id: string
  /** 消息发送方。 */
  readonly role: ChatRole
  /** 按原始响应顺序拆分得到的结构化内容块。 */
  readonly content: readonly ChatMessageContent[]
  /** 消息当前的请求或流式接收状态。 */
  readonly status: ChatMessageStatus
  /** 用户消息可选的原文引用信息。 */
  readonly quote?: ChatQuote
}
