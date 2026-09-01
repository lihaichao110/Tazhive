# Shared API

这里承载与业务无关的 Axios 客户端工厂、访问令牌接入和统一错误模型。具体接口路径、请求参数与响应类型仍应放在对应 feature 或 entity 内。

未来登录模块通过 `registerAccessTokenProvider` 注册内存中的 access token 读取器。客户端会在每次请求前读取最新值；注册函数返回的清理函数用于退出登录或 Provider 卸载。

401 当前只转换为 `HttpError`，不执行刷新或页面跳转。后续接入 refresh token 时，应在应用鉴权能力中统一实现单飞刷新和最多一次的原请求重放。
