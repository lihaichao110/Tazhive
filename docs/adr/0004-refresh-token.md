# ADR-0004：引入刷新令牌实现会话静默续签

## 状态

已采纳；后端刷新接口待实现，前后端需协同发布。

## 背景

访问令牌只有一个且有效期较短，前端不知道过期时间，也没有任何续签手段。
令牌过期后第一个请求收到 401 即清除会话，用户必须手动重新登录，
长对话、表单填写等场景会被直接打断（见 ADR-0003 的启动校验背景）。

## 决策

### 接口契约（后端）

- `POST /api/v1/auth/login` 响应在原有基础上增加 `refresh_token`：
  `{ access_token, refresh_token, token_type }`。
- 新增 `POST /api/v1/auth/refresh`，请求体 `{ refresh_token }`：
  - 校验通过返回 `{ access_token, refresh_token, token_type }`；
    采用轮换策略，每次签发新 refresh_token 并立即作废旧值，防止重放；
  - refresh_token 无效、过期或已撤销返回 `401`。
- 有效期建议：access_token 30 分钟，refresh_token 7 天。
  后端必须完整校验刷新令牌签名与状态，不得只解析本地过期字段。

### 前端机制

- 双令牌均持久化在 localStorage（`tazhive:access-token` / `tazhive:refresh-token`），
  内存 ref 仍只镜像 access token 供请求实时读取。
- 请求层 401 不再直接判定会话失效，统一进入恢复入口
  `recoverFromAccessTokenRejection(usedToken)`：
  - 被拒令牌已不是当前令牌 → 其他请求已完成刷新，直接以当前令牌重试；
  - 当前令牌确实被拒 → 单飞（single-flight）刷新，并发 401 共享同一次刷新请求；
  - 刷新成功以新令牌重试原请求一次（WeakSet 标记防死循环）；
    刷新失败上报令牌拒绝、清理会话，退回登录态。
- 刷新器由 `AuthProvider` 注册进 shared 桥接层（`registerAccessTokenRefresher`），
  shared 层不反向依赖认证模块；应用刷新前比对会话令牌，
  刷新期间发生重新登录时丢弃过期结果。
- 刷新接口自身使用 `createHttpClient({ authentication: false })` 发送，
  不注入 Bearer 也不触发恢复，避免递归。
- 聊天 SSE 通道（绕过 Axios 的 fetch 边界）401 时走同一恢复入口，
  静默刷新后原样重发一次。
- ADR-0003 的启动时主动校验由本机制取代（该 ADR 已废弃）：
  本地令牌在启动时直接按已登录态渲染，过期令牌由运行期首个业务请求
  触发同一静默续签与重试链路处理。

## 影响

正常运行期间令牌过期对用户透明，登录态由 refresh_token 的有效期（约 7 天）决定。
登录响应缺少任一令牌按异常处理，后端未上线刷新接口前登录会失败，
因此登录接口改造必须与后端同步发布。刷新令牌持久化在 localStorage，
与既有 access token 的存储等级一致，适合当前内部系统威胁模型；
若未来对外开放需升级为 HttpOnly Cookie 方案。
