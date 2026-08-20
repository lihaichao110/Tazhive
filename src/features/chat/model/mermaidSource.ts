// 演示用图表源码：对应示例对话中“游客模式 → Markdown 渲染”的分支流程。
export const MERMAID_SOURCE = `flowchart LR
  A[用户提问] --> B{游客模式?}
  B -- 是 --> C[提示登录]
  B -- 否 --> D[生成图表]
  C --> E[改用 Markdown 渲染]
  D --> E
  E --> F[对话继续]
`
