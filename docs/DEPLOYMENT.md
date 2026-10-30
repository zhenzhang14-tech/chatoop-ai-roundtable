# Setup and deployment / 配置与部署

This guide describes steps for your own instance. Repository publication does not run them automatically. No production website, DNS, cloud database, or provider secret was changed during source cleanup.

本指南用于你自己的实例。公开仓库不会自动执行这些步骤，源码整理没有部署生产网站、修改 DNS、云端数据库或供应商密钥。

## Local use / 本地使用

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5180`. The local server defaults to simulated replies. For real models, copy `.dev.vars.example` to `.dev.vars`, set `MOCK_MODE=false`, supply the provider key, and set exact model IDs. `.dev.vars` is read by the local Node adapter; process environment variables override its values. Restart after changing environment configuration. The adapter watches source changes during development.

打开上述地址。默认使用模拟回复。接入真实模型时复制配置示例、关闭模拟模式、填写供应商密钥与精确模型 ID。Node 本地适配器读取 `.dev.vars`，进程环境变量优先。环境配置变化后需要重启，开发期间会监视源码变化。

| Variable / 变量       | Purpose / 用途                                                                 | Default / 默认                                                              |
| --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `MOCK_MODE`           | Simulated provider with visible labels / 明确标注的模拟供应商                  | Local adapter: true; Worker: false / 本地 true，Worker false                |
| `OPENROUTER_API_KEY`  | Server-only provider credential / 仅服务端使用的模型凭据                       | Empty / 空                                                                  |
| `PROVIDER_BASE_URL`   | Compatible provider API base / 兼容接口基础地址                                | `https://openrouter.ai/api/v1`                                              |
| `ROUND_TABLE_MODELS`  | Comma-separated exact upstream IDs / 逗号分隔的精确模型 ID                     | Example IDs; replace as needed / 示例 ID，按需替换                          |
| `ALLOW_ANONYMOUS`     | Permit model calls without instance login / 是否允许未登录调用模型             | Local true; Worker false / 本地 true，Worker false                          |
| `ENABLE_REGISTRATION` | Permit account creation / 是否开放注册                                         | false                                                                       |
| `ALLOWED_ORIGINS`     | Explicit frontend origins / 允许的前端来源                                     | Local origins in example; empty Worker list / 示例含本地来源，Worker 空列表 |
| `SITE_URL`            | Optional canonical frontend origin / 可选的规范前端来源                        | Local development URL / 本地开发地址                                        |
| `VITE_API_URL`        | Frontend's separate API origin, never a secret / 前端独立 API 地址，不可放密钥 | Empty, same-origin/proxy / 空，使用同域或代理                               |

Provider credentials and account data can exist in `.local/state.json`. That directory is excluded from Git but is not encrypted by this app. Protect it like other application data; do not serve it as static files.

供应商凭据和账户数据可能保存在 `.local/state.json`。该目录不进入 Git，但应用本身不对其静态加密；应保护它，不能当作静态资源对外提供。

## Cloudflare Worker, same origin / Cloudflare 同域托管

The supplied `wrangler.jsonc` serves the Vite `dist/` assets and routes `/api/*` to the Worker. Use your own Cloudflare account and new instance names. It contains no account, database or namespace identifiers from the original deployment.

提供的配置让 Worker 同时托管前端与 API，不包含原部署的账户、数据库或命名空间标识。

1. Build locally / 先在本地构建：

   ```bash
   npm ci
   npm run build
   ```

2. Create your own persistence binding when you choose to provision cloud resources / 决定创建云端资源时，为自己的实例准备持久化：

   ```bash
   npx wrangler kv namespace create SESSIONS
   ```

   Add the returned namespace ID to your configuration / 把返回的命名空间 ID 填入配置：

   ```json
   "kv_namespaces": [
     { "binding": "SESSIONS", "id": "YOUR_NAMESPACE_ID" }
   ]
   ```

   Replace the placeholder before deployment. KV stores optional account/session records, model/provider registry entries and the low-volume public feed. Its shared feed index is not a high-concurrency transactional queue.

   占位符必须替换。KV 保存可选账户/会话、模型/供应商注册记录和低流量公开历史，其共享索引不是高并发事务队列。

3. Configure the secret through Wrangler or your own platform's secret manager / 通过自己的密钥管理配置：

   ```bash
   npx wrangler secret put OPENROUTER_API_KEY
   ```

   Enter credentials yourself; do not commit their values. Set `ROUND_TABLE_MODELS` to available exact IDs. Keep `MOCK_MODE=false` for real calls.

   凭据由你本人输入，不要提交其值；模型 ID 必须在供应商处可用。

4. Configure access **before** offering a shared provider key to visitors. The default Worker disables anonymous model calls and registration. For private personal use, protect the whole instance with your own access layer, then deliberately choose whether the app should permit anonymous calls behind it. For accounts, provision storage and temporarily enable registration only within that protected setup. The application does not sell credits or enforce a commercial prepaid wallet.

   在让访客使用共享模型密钥之前，先配置访问边界。Worker 默认关闭匿名模型调用和注册。私人使用时可先用自己的访问层保护整个实例，再明确决定是否在其后允许应用匿名调用。使用账户时，先配置持久化，仅在受保护的环境里临时开放注册。本应用不销售积分，也不提供商业预付钱包。

5. When you are ready to create/update your own deployment / 准备好后，由你对自己的目标执行：

   ```bash
   npm run worker:deploy
   ```

6. Inspect `/api/health`, the visible simulation label, configured model catalog, and a small authorized real-model request. These source-release checks did not perform that live request.

   核对健康状态、是否显示模拟提示、模型目录，再进行一次经过授权的小额真实调用。本次源码发布没有执行该真实调用。

## Separate frontend and API / 前后端分开

Set `VITE_API_URL` before building the frontend. Set `ALLOWED_ORIGINS` to the exact frontend origin(s) on the API deployment. Cross-origin requests do not gain access merely because the origin says localhost. CORS is not authentication: also configure access control for provider-backed endpoints.

构建前配置前端的 `VITE_API_URL`，API 侧明确配置 `ALLOWED_ORIGINS`。远程服务不会仅因来源写着 localhost 就信任请求。CORS 不等于身份认证，真实模型接口还需要访问控制。

## Optional administrator / 可选管理员

For the local adapter: enable registration deliberately, create your operator account, stop the server, run `node scripts/grant-local-admin.mjs operator@example.com`, restart and log in. New registrations never get admin access automatically, including the first account or an email that happens to match an allowlist.

Cloud administrators must be provisioned through the instance operator's trusted storage-management process. The local grant script does not access Cloudflare. Do not make a public "claim first admin" route.

本地管理员通过明确注册、停服、运行本地授权脚本、重启和重新登录获得。首位注册者或碰巧匹配白名单的邮箱都不会自动获得管理员权限。云端管理员由部署者通过可信的存储管理流程配置；本地授权脚本不会访问 Cloudflare，也不应提供公开“抢占首位管理员”接口。

## Advanced adapters / 进阶适配

The retained Worker includes D1 key/value and D1/R2 public-discussion adapters, with `schema.sql` as schema reference. The core automated suite exercises the in-memory KV contract; live D1/R2 migration, cloud account provisioning, DNS and production rollout are outside this release's verification. Use your own staging environment before choosing those adapters.

Worker 保留 D1 键值与 D1/R2 公开讨论适配，结构参考 `schema.sql`。核心测试验证的是内存 KV 契约；真实 D1/R2 迁移、云账户资源创建、DNS 和生产上线不在本版验证范围，应先在自己的测试环境验证。

## Troubleshooting / 常见问题

| Symptom / 现象                                         | Check / 检查                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| API disconnected / 服务未连接                          | Start both services with `npm run dev`; check ports 5180/8787 / 用完整启动命令，检查端口                                        |
| No enabled models / 无可用模型                         | Provider key, `MOCK_MODE`, exact model IDs, enabled registry/provider / 密钥、模拟开关、模型 ID 和启用状态                      |
| Authentication required / 需要认证                     | Worker defaults and access plan / Worker 默认值及访问方案                                                                       |
| Registration disabled / 注册关闭                       | Deliberate `ENABLE_REGISTRATION` setting / 按需要明确开启注册                                                                   |
| Password-reset email unavailable / 无法发送找回邮件    | Email delivery is not implemented / 本版本未实现邮件发送                                                                        |
| Missing private chats after sign-in / 登录后没有旧对话 | Private chats belong to the browser, not cloud account storage / 私人会话属于浏览器，不随账户自动同步                           |
| No QR on local poster / 本地长图无二维码               | Publish to a real HTTPS instance first / 先在真实 HTTPS 实例公开                                                                |
| Stream interruption / 输出中断                         | Retry explicitly; the app avoids automatically duplicating a potentially billed call / 明确重试，应用避免静默重复可能计费的请求 |
