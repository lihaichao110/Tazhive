# GitHub Actions 部署说明

项目在代码推送到 `main` 或手动触发工作流时，会先检查并构建，再通过 `ssh-deploy` 将 `dist/` 同步到服务器。

## GitHub Secrets

在仓库的 `Settings → Secrets and variables → Actions` 中创建：

| Secret            | 是否必填 | 说明                                         |
| ----------------- | -------- | -------------------------------------------- |
| `SSH_HOST`        | 是       | 服务器主机名或 IPv4 地址，不含协议和端口     |
| `SSH_USER`        | 是       | 用于部署的低权限 SSH 用户                    |
| `SSH_PRIVATE_KEY` | 是       | 无口令的专用部署私钥，仅授予目标目录所需权限 |
| `SSH_KNOWN_HOSTS` | 是       | 已核验的服务器 SSH 公钥记录                  |
| `DEPLOY_PATH`     | 是       | 专用静态目录，例如 `/var/www/tazhive`        |
| `SSH_PORT`        | 否       | SSH 端口，未设置时使用 `22`                  |

请在可信环境中核对服务器公钥指纹后生成 `SSH_KNOWN_HOSTS`。自定义端口可执行 `ssh-keyscan -p 2222 example.com`，不要在工作流中临时扫描并盲目信任结果。

## 服务器首次准备

1. 安装 SSH 和 rsync，并为部署用户配置公钥。
2. 创建 `DEPLOY_PATH` 目录并授予部署用户写权限。该目录应只存放站点文件，因为部署会删除 `dist/` 中不存在的旧文件。
3. 将 Nginx 站点根目录指向 `DEPLOY_PATH`，并配置 SPA 回退：

Nginx 的站点配置至少需要类似规则：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 构建环境变量

当前构建不需要额外变量。以后增加的所有 `VITE_*` 值都会写入浏览器资源，不能用于保存真正的密钥。

## 首次运行

完成服务器和 Secrets 配置后，可在仓库的 `Actions → 部署生产环境` 页面手动运行。确认部署成功后，后续每次推送到 `main` 都会自动部署。
