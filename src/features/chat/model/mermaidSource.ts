// 演示用图表源码：对应示例对话中“游客模式 → Markdown 渲染”的分支流程。
export const MERMAID_SOURCE = `flowchart LR
  A[用户提问] --> B{游客模式?}
  B -- 是 --> C[提示登录]
  B -- 否 --> D[生成图表]
  C --> E[改用 Markdown 渲染]
  D --> E
  E --> F[对话继续]

  classDef entry fill:#EEF2FF,stroke:#6366F1,color:#312E81,stroke-width:2px
  classDef decision fill:#FFF7ED,stroke:#F59E0B,color:#7C2D12,stroke-width:2px
  classDef alert fill:#FFF1F2,stroke:#FB7185,color:#881337,stroke-width:2px
  classDef generation fill:#F5F3FF,stroke:#8B5CF6,color:#4C1D95,stroke-width:2px
  classDef process fill:#ECFEFF,stroke:#06B6D4,color:#164E63,stroke-width:2px
  classDef success fill:#ECFDF5,stroke:#34D399,color:#065F46,stroke-width:2px

  class A entry
  class B decision
  class C alert
  class D generation
  class E process
  class F success
`
