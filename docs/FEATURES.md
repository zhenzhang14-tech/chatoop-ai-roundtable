# Feature reference / 完整功能清单

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [Interface / 界面](INTERFACE.md)

## Modes / 模式

| Mode / 模式                 | Who sees what / 可见上下文                                                                                                                   | Execution / 执行                                                                   | End / 结束方式                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Independent / 独立          | Earlier conversation, but no other answer from the current round / 可参考前文，看不到同轮其他回答                                            | Concurrent / 并行                                                                  | One round / 一轮                                                                                                                                                               |
| Discussion / 讨论           | Earlier conversation and statements already made in this round / 前文及同轮已发出的内容                                                      | Turn by turn / 轮流发言                                                            | One round per host message / 主持人每次发言推进一轮                                                                                                                            |
| Automatic debate / 自动辩论 | Independent opening; later rounds see the discussion record and the participant's own prior statement / 首轮独立，后续读取讨论和本人先前观点 | Parallel opening, rotating speaking order afterward / 开场并行，后续轮换首位发言者 | Default 4, configurable 3–6 rounds; may finish after 3+ rounds and two complete stable-agreement assessments / 默认 4 轮，可选 3–6；至少三轮且连续两轮完整评估一致时可提前结束 |
| Yes/No poll / 赞成反对      | The question and supplied discussion context / 问题及提供的讨论上下文                                                                        | Independent per-model requests / 各模型独立请求                                    | All requested model responses settle / 请求均返回或失败后结束                                                                                                                  |
| Custom poll / 自定义投票    | Same as poll, with 2–6 explicit options / 同上，并提供 2–6 个明确选项                                                                        | Votes normalized against actual option labels/text / 按实际选项标签或文本解析      | Invalid replies remain visibly invalid / 无效回复明确显示为无效                                                                                                                |
| Single model / 单模型       | Selected conversation messages / 所选会话消息                                                                                                | One model with streamed text / 一个模型逐字输出                                    | One answer / 一次回答                                                                                                                                                          |

Speaking-style presets affect expression, not a model's required conclusion. Agreement, disagreement and explicit revisions are allowed. The app does not require every participant to manufacture an opposing position.

说话风格只影响表达方式，不规定结论。模型可以赞同、反对或明确修改观点，不要求每个参与者都为了反对而反对。

## Model controls / 模型控制

- Homepage: select 2–6 enabled models, browse/search the full instance catalog, save defaults, and reorder participants.
- Chat: choose single-model or roundtable behavior, select/reorder participants, and type `@` to use the mention suggestions. `@all` addresses the selected group. A named participant can be addressed temporarily without rebuilding the whole panel.
- The catalog comes from server configuration and enabled administrator records. Unavailable models are not presented as successfully called models.
- Failures are associated with the participant; successful independent answers are retained. Poll failures and invalid replies do not become Yes/No votes.

- 首页可选择 2–6 个启用模型，浏览/搜索实例目录、保存默认选择并排序。
- 聊天中可切换单模型与圆桌，选择/排序参与者；输入 `@` 使用点名建议，`@all` 面向当前模型组。可以临时点名，不必重新配置整组。
- 模型目录来自服务端配置和管理员启用记录；不可用模型不会冒充调用成功。
- 异常按模型展示，保留其他成功回答；失败或无效投票不会伪装成赞成/反对。

## Summaries and evidence / 总结与证据

The summary receives recorded model statements from every available round. Long statements are excerpted and labeled. The engine also retains each participant's opening and latest statements when constructing discussion context.

A neutral assessment proposes a short final-position label and an exact quote for each participant. Quotes must exist in the relevant recorded answer; missing or invalid evidence cannot establish complete agreement. Two consecutive complete agreement assessments can end an automatic debate after round 3. Assessments remain model judgments; they are not fact checks.

Stance-change counts compare complete initial/final assessments. A weaker tone, lower confidence or concession on one supporting point alone should not count as a different final answer. If either assessment is incomplete, the numerical count is **Unknown**. Cards retain final positions and their quoted evidence.

总结读取可用轮次的模型发言；长发言会节选并标注。构造讨论上下文时，还保留各模型的开场与最近发言。

中立评估会给出最终立场标签和逐模型原文引用；引用必须能在对应回答中找到，缺失或无效证据不能构成完整一致。至少三轮、连续两轮完整一致评估，可使自动辩论提前结束。评估仍然是模型判断，不是事实核查。

立场变化次数比较完整的首末评估。语气缓和、信心下降或承认某个论据，不自动等于最终答案改变。首末任一评估不完整时，数字显示**未测量**。卡片保留最终立场及其引用。

## Poll results and images / 投票结果与长图

- Option bars count valid votes; percentages use valid votes as the denominator. Invalid/failed participants remain visible with `?` or an error. A tie does not become a majority.
- The result card follows the owner-supplied design: dark identity strip, question, pastel vote proportions, model identities, final summary, expandable decisions and sharing actions.
- The deterministic summary reports counts and minority selections without inventing agreement or claiming factual correctness.
- **Save share poster** draws a PNG locally in the browser, including the question, proportions, decisions, reasons, summary and instance branding. Long content is excerpted for the image; Markdown preserves a fuller record.
- A QR code is added only after there is an explicit published HTTPS URL. Localhost is not encoded as a supposedly public share URL. Image export does not send the content to an image-generation service.

- 比例条只统计有效票，分母为有效票数；无效或失败的模型仍显示 `?` 或错误，平票不会被称作多数。
- 结果卡按所有者提供的示例组织：深色品牌栏、问题、浅色比例条、模型标识、最终总结、可折叠决策和分享按钮。
- 确定性总结说明票数与少数选择，不虚构共识或正确性。
- **保存分享长图**在浏览器本地绘制 PNG，包含问题、比例、决策、理由、总结和实例品牌。长内容会为图片节选，完整过程建议另存 Markdown。
- 只有明确公开并获得 HTTPS 页面链接后才加入二维码；不会把 localhost 伪装成公开分享链接，也不会将内容上传到绘图服务。

## Local conversations and attachments / 本地会话与附件

The browser retains up to 20 conversations and a bounded message history (up to 300 messages per conversation). Reloading restores messages and clears interrupted loading indicators. It does not restart an unfinished debate. Switching chats or stopping prevents future turns from writing into another chat.

Up to five attachments can be selected. Text-like files up to 1 MiB are read locally with at most 12,000 characters per file. The extracted context is sent to the chosen model provider when you submit. Other file types may be listed by name but are not OCR'd or parsed as documents. Do not assume that attaching an image/PDF makes its content available to a model.

浏览器最多保存 20 个会话，每个会话最多保留 300 条消息。刷新恢复消息并清除未结束的加载标记，不会自动续跑辩论。切换会话或停止后，旧流程的后续结果不会写进另一会话。

最多选择五个附件。文本类文件不超过 1 MiB，每个最多读取 12,000 字符；提取在本地完成，提交时会把提取内容发给所选模型供应商。其他类型可以显示文件名，但不执行 OCR 或文档解析。附件栏里有图片/PDF，不表示模型已读取其中内容。

## Public history and statistics / 公开历史与统计

Publication is explicit. Result cards ask for confirmation before sending the question, model names, replies/votes and summary to the instance's public feed. Public History provides search, category/mode/language filters, sorting, pagination and detail links. A fresh instance starts empty; it does not manufacture archived conversations or vote counts.

Statistics aggregate records published to that instance, including participation and poll-outcome distributions. They describe those records, not global model quality, persuasion causality or benchmark performance. An empty instance has no performance data.

公开必须主动触发。结果卡在发送问题、模型名、回答/投票和总结到当前实例前会提示确认。公开历史提供搜索、类别/模式/语言筛选、排序、分页及详情链接。新实例从空历史开始，不会生成冒充真实历史的对话或票数。

统计基于当前实例的公开记录，包括参与情况和投票分布；它描述这些记录，不代表全网模型能力、说服因果或基准成绩。空实例没有模型表现数据。

## Accounts, settings and administration / 账户、设置与管理

| Surface / 界面           | Supported / 支持                                                                                                                    | Boundary / 边界                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preferences / 偏好       | Language, automatic rounds, available-model view / 语言、自动轮次、可用模型查看                                                     | Local to this browser / 仅当前浏览器                                                                                                                     |
| Local history / 本地会话 | Open, delete, export all / 打开、删除、导出全部                                                                                     | Not account synchronization / 不等于账户同步                                                                                                             |
| Account / 账户           | Optional signup/login/logout, profile name, password change and session revocation / 可选注册、登录、退出、名称保存、改密并撤销会话 | No verification/reset email delivery / 不发送验证或找回邮件                                                                                              |
| Usage / 用量             | Local activity overview / 本地活动概览                                                                                              | No payment, wallet billing or provider invoice / 不收款，不作为钱包扣费或供应商账单                                                                      |
| Admin / 管理             | Authenticated provider/model create, edit, delete, test and model sync / 经认证的供应商及模型增删改、测试、同步                     | Only operator-granted administrators; fake finance/invite/announcement controls removed / 管理员须由部署者授予，已移除未接通的财务、邀请码和公告演示控件 |

Provider credentials in administrator records are server-side data. The simple local store is not encrypted at rest; protect `.local/` and prefer environment secrets for routine use. API responses mask provider-key values.

管理记录中的供应商凭据属于服务端数据。简单本地存储不提供静态加密，应保护 `.local/`，常规使用优先采用环境密钥。API 返回的供应商密钥会打码。

## Explicitly outside this release / 本版不包含

Real payments/refunds/invoices; email delivery; automated production deployment; background durable debate jobs; automatic private cross-device sync; live web research; OCR/PDF/Office parsing; verified factual consensus; guaranteed model availability; high-concurrency transactional KV indexes.

真实收付款/退款/账单、邮件发送、自动生产部署、后台持久辩论任务、私人会话自动跨设备同步、实时联网研究、OCR/PDF/Office 解析、经过事实核验的共识、模型可用性保证，以及高并发 KV 索引事务。
