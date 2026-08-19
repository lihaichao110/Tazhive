# Tazhive · 泰智汇

Tazhive 是基于 React、TypeScript 与 Vite 构建的前端项目。项目采用业务功能优先的模块化架构，并通过统一的类型检查、静态检查和格式化规则保证团队协作质量。

## 环境要求

- Node.js 24 或当前维护中的 LTS 版本
- pnpm 10+

请使用仓库中的 `pnpm-lock.yaml` 安装依赖，不要混用 npm、Yarn 或其他锁文件。

## 开始开发

```bash
pnpm install
pnpm dev
```

常用命令：

| 命令                | 作用                          |
| ------------------- | ----------------------------- |
| `pnpm dev`          | 启动本地开发服务器            |
| `pnpm typecheck`    | 执行 TypeScript 类型检查      |
| `pnpm lint`         | 执行 Oxlint 静态检查          |
| `pnpm format`       | 使用 Prettier 格式化项目文件  |
| `pnpm format:check` | 检查格式但不修改文件          |
| `pnpm check`        | 汇总执行类型、Lint 与格式检查 |
| `pnpm build`        | 类型检查并构建生产产物        |
| `pnpm preview`      | 本地预览生产构建              |

## 项目结构

```text
src/
├── app/        # 应用装配、Provider、路由、Store 和全局样式
├── pages/      # 页面级组件与页面编排
├── widgets/    # 可复用的复合页面区块
├── features/   # 独立业务能力
├── entities/   # 稳定领域实体
└── shared/     # 无业务含义的通用能力
```

跨模块导入使用 `@/` 别名。业务模块的外部消费者只能从模块根部 `index.ts` 导入，详细依赖边界见[架构说明](./docs/ARCHITECTURE.md)。

## 开发约定

- 每个文件最多 300 行，接近上限时主动拆分组件、Hook、类型、数据和工具函数。
- 组件样式默认使用 CSS Modules。
- 提交前执行 `pnpm check` 和 `pnpm build`。
- 不通过压缩代码规避文件行数限制。

完整规则见[编码规范](./docs/CODING_STANDARDS.md)，编码代理还必须遵循根目录的 [AGENTS.md](./AGENTS.md)。
