# Release verification / 发布验证

Source cleanup date / 源码整理日期: 2026-10-30 (Asia/Shanghai).

Completed before public-source preparation / 已完成：

- Dependency installation and audit: 206 installed packages, no audit findings at the time of installation.
- `npm run check`: lint, 23 core regression tests and the Vite production build passed before the final documentation/static cleanup.
- Core coverage: independent parallel replies; participant failure isolation; cancellation; minimum-round/stable-agreement behavior; exact quoted assessment evidence; initial/final stance comparison; unknown counts; context preservation; SSE CRLF parsing; valid poll proportions/ties; bilingual dictionary parity; API simulation labels; guarded real-mode calls; registration/admin boundaries; rejection of client debit amounts; empty public history; honest unavailable reset-email response; real-mode login reachability.
- Manual browser inspection with simulated replies: Chinese homepage, independent replies, conversation restore, automatic multi-round discussion with evidence-backed summary, and custom-poll layout.
- Owner-provided poll/share-poster reference images are included with explicit example captions.

安装依赖时审计未发现漏洞；代码检查、23 项核心测试和构建已通过。浏览器检查使用模拟回复，覆盖中文首页、独立回答、恢复会话、多轮讨论摘要和自定义投票布局。所有者提供的两张图片按效果示例标注。

The owner then requested that model-call testing stop because no API key is configured. No real model requests were made. Subsequent work was limited to source corrections, documentation, static build/source checks and publication. The mock custom-option adapter and poster layout received final source corrections after manual inspection; their latest version was not re-exercised with live model calls.

随后所有者要求停止模型调用测试，原因是尚未配置 API Key。未执行真实模型请求；后续仅做源码修正、文档、静态构建/文件检查和发布。模拟自定义选项适配与长图布局在检查后做了最后源码修正，其最新版本没有使用真实模型重新联调。

Final static gates / 最终静态检查：`npm run lint`, `npm run build` and `npm run scan:public` passed on the publication candidate. Live provider integration remains unverified.

Not verified in this session / 本次未验证：

- Real OpenRouter/other-provider connectivity, quality, latency or billing.
- A live Cloudflare deployment, DNS, KV/D1/R2 provisioning or migration.
- Email delivery, real payments and background debate jobs (not implemented).
- The committed Playwright desktop/mobile suite was prepared for reproducible CI; no claim is made that it ran locally in this session.

真实供应商连通性、效果、速度和计费，线上 Cloudflare/DNS/存储资源，以及本次未在本地执行的 Playwright 桌面/手机套件，都不写成已通过。邮件、收款和后台辩论任务不属于已实现能力。

## GitHub CI / GitHub 自动检查

The first published candidate `4405bae` passed the complete [GitHub source-check workflow](https://github.com/zhenzhang14-tech/chatoop-ai-roundtable/actions/runs/41064080606): clean dependency installation, lint, 23 core tests, production build, public-source scan and all 6 desktop/mobile browser cases. Browser tests use simulated replies and no provider key. This is cloud CI verification, not real-provider integration or production deployment.

首次公开候选 `4405bae` 的 GitHub 自动检查已通过：安装依赖、代码检查、23 项核心测试、构建、公开源码扫描及全部 6 项桌面/手机浏览器用例。浏览器用例使用模拟回复，无需供应商密钥。这是云端 CI 验证，不是实际模型联调或生产部署。
