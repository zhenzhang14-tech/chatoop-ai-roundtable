# Security / 安全说明

Do not put credentials or private conversation content in public issues. For a sensitive report, use the repository's private security-reporting feature if the owner has enabled it; otherwise ask the owner for a private channel without including the sensitive details.

不要在公开 issue 中放密钥或私人对话。敏感问题可使用仓库所有者启用的私密安全报告功能；未启用时先向所有者询问私密渠道，不公开敏感细节。

- Model calls go through the API. `VITE_*` values are public build-time configuration.
- The local JSON store is ignored by Git, but not encrypted by the application.
- Public sharing exposes the explicitly published question, model replies/votes and summary.
- The Worker defaults to no anonymous real-model calls and no open registration. Access control is necessary before sharing a server-funded provider key.
- Regular users do not become administrators by being first or by choosing an email address.
- The open-source edition does not charge wallets; client-submitted debit amounts are rejected.
- `scan:public` checks common credential formats and local artifacts; human review remains necessary for unusual secret formats or private content.

- 模型经服务端调用，`VITE_*` 是公开构建配置。
- 本地 JSON 存储被 Git 忽略，但应用本身不加密。
- 主动公开后，问题、模型回答/投票和总结可被访问实例的人查看。
- Worker 默认关闭匿名真实调用与注册，共享服务端付费密钥前须配置访问控制。
- 不会因首位注册或自选邮箱而授予管理员。
- 开源版不扣钱包，拒绝客户端指定的扣款金额。
- 扫描脚本不能覆盖所有特殊秘密格式或私人内容，发布者仍应审阅文件范围。
