# Contributing / 参与开发

Use Node.js 22.12+ and `npm ci`. Keep provider keys in ignored `.dev.vars` or a managed server-side secret store. Develop with the clearly labeled mock runtime when real credentials are unnecessary.

使用 Node.js 22.12+ 和 `npm ci`。密钥仅放在被忽略的 `.dev.vars` 或服务端托管密钥中；不需要真实凭据时使用明确标注的模拟模式。

Before submitting changes / 提交前：

```bash
npm run check
npm run scan:public
```

For UI changes, run `npm run test:ui` after installing Playwright's Chromium, or inspect your locally running app at desktop and mobile breakpoints. Use simulated replies for regressions. State separately whether you made real provider calls; never describe a mocked response as a model-quality result.

修改界面时，可安装 Playwright Chromium 后运行界面回归，或检查桌面及手机断点。回归使用模拟回复；真实供应商调用单独说明，模拟内容不能写成模型能力结论。

Keep English and Chinese feature strings in sync. Update both README files and `docs/FEATURES.md` whenever behavior changes. Document incomplete evidence as unknown rather than inventing model positions, percentages or conversation history. Preserve cancellation and conversation ownership when modifying async code.

功能变化要同步中英文文案、两份 README 和功能清单。证据不足写明未知，不虚构模型立场、比例或历史。异步代码必须保留取消与会话归属保护。

CI checks source and builds only; it does not deploy. Cloud resource creation, deployments, production data changes, credential rotation and external publishing require the instance owner's separate authorization and tooling.

CI 只检查和构建，不部署。云资源创建、上线、生产数据变化、凭据轮换和外部发布由实例所有者另行授权与执行。
