const FALLBACK_MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "deepseek/deepseek-chat",
];

export function flag(value) {
  return value === true || String(value).toLowerCase() === "true";
}

export function configuredCatalog(env) {
  if (flag(env.MOCK_MODE))
    return Object.fromEntries(
      [
        ["demo-planner", "Demo Planner / 演示规划者"],
        ["demo-skeptic", "Demo Skeptic / 演示质疑者"],
        ["demo-analyst", "Demo Analyst / 演示分析者"],
      ].map(([id, name]) => [
        id,
        {
          id,
          name,
          source: "mock",
          system:
            "You are a demo roundtable participant. Never claim to be a real hosted model.",
        },
      ]),
    );
  const ids = String(env.ROUND_TABLE_MODELS || FALLBACK_MODELS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (!env.OPENROUTER_API_KEY) return {};
  const provider = {
    id: "environment",
    name: "Configured provider",
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.PROVIDER_BASE_URL || "https://openrouter.ai/api/v1",
    timeoutMs: 90_000,
  };
  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        id,
        name: id.split("/").at(-1),
        source: "registry",
        system:
          "You are a participant in ChatOOP AI Roundtable. Be clear, evidence-aware and concise. State uncertainty. Reply in the language of the question.",
        model: {
          id,
          displayName: id.split("/").at(-1),
          upstreamModel: id,
          tags: [],
        },
        provider,
        providerChain: [{ model: { upstreamModel: id }, provider }],
      },
    ]),
  );
}

export function publicConfiguredModels(env) {
  return Object.values(configuredCatalog(env)).map((m) => ({
    id: m.id,
    displayName: m.name,
    providerName: m.source === "mock" ? "Demo / 演示" : "Configured provider",
    enabled: true,
    source: m.source,
    tags: m.source === "mock" ? ["demo"] : [],
  }));
}

export function mockReply(modelId, messages) {
  const text = messages.map((m) => m.content || "").join("\n");
  const zh =
    /全程.*中文|全程简体中文|Simplified Chinese|原始提问：「[\u3400-\u9fff]|[\u3400-\u9fff]{4}/.test(
      text,
    ) && !/Reply entirely in English|reason.*English/.test(text);
  const round = Number(text.match(/Round (\d+)/)?.[1] || 1);
  const topic =
    text.match(/Original topic: ([^\n]+)/)?.[1] ||
    text.match(/Topic: "([^"\n]+)/)?.[1] ||
    "";
  if (/Assess only the participants/.test(text)) {
    const blocks = [
      ...text.matchAll(/\[Round (\d+) · ([^\n]+) · ([^\]\n]+)\]\n([^\n]+)/g),
    ];
    const positions = blocks.map((m) => ({
      modelId: m[3],
      stance: "pilot-first",
      quote: m[4].slice(0, 48),
    }));
    return JSON.stringify({ positions, consensus: "full", unresolved: [] });
  }
  if (/Return JSON only|Cast your vote|vote options|"vote"/i.test(text)) {
    const optionLine = text.match(/Vote options:\s*([^\n]+)/)?.[1] || text;
    const options = [
      ...optionLine.matchAll(/(?:^|\|)\s*([A-F]):\s*([^|\n]+)/g),
    ];
    const index = modelId.includes("skeptic") ? 1 : 0;
    return JSON.stringify({
      vote:
        options[Math.min(index, options.length - 1)]?.[1] ||
        (index ? "NO" : "YES"),
      reason: zh
        ? "这是模拟投票：先比较收益、成本和失败条件。"
        : "This is a simulated vote: compare benefits, costs and failure conditions first.",
    });
  }
  if (
    /neutral meeting editor|中立主持人|Summarize this|consolidated/i.test(text)
  ) {
    const changes = text.match(/recorded stance-change count is (\d+)/)?.[1];
    return zh
      ? `先通过小规模试点验证方案，再根据结果决定是否扩大。\n立场改变：${changes ?? "未测量"}（演示数据）\n共识程度：高度共识（演示发言估计）\n\n共识点\n- 规划者与分析者建议先明确目标和验收标准。\n分歧点\n- 质疑者更重视停止条件和隐性成本。\n新角度\n- 把可逆的小试点作为共同起点。\n结论置信度\n低：这些是模拟回复，用于验证界面和流程。`
      : `Validate the proposal in a small pilot before expanding it.\nStanceChanges: ${changes ?? "Unknown"} (demo data)\nConsensus level: High Consensus (simulated statement estimate)\n\nConsensus\n- Planner and Analyst favor measurable acceptance criteria.\nDivergence\n- Skeptic emphasizes stop conditions and hidden costs.\nFresh angles\n- Start with a reversible pilot.\nConfidence\nLow: these are simulated replies for testing the interface and workflow.`;
  }
  const view = modelId.includes("skeptic")
    ? zh
      ? "我会先看方案在哪些条件下会失败，明确成本和停止条件，再做可逆的小试点。"
      : "I would identify failure conditions, costs and a stop rule, then run a reversible pilot."
    : modelId.includes("analyst")
      ? zh
        ? "可以先用小规模试点验证，记录成功指标，再比较结果与原先的假设。"
        : "Run a small pilot, record success measures, and compare the result with the original assumptions."
      : zh
        ? "我的建议是先做小规模试点：确定目标、负责人和验收标准，然后再决定是否扩大。"
        : "My recommendation is a small pilot: define the goal, owner and acceptance criteria before expanding.";
  return `${zh ? "【模拟回复】" : "[Simulated response] "}${view}${round > 1 ? (zh ? ` 第 ${round} 轮：我保留先试点的立场，并将其他参与者提出的风险加入验收条件。` : ` Round ${round}: I retain the pilot-first position and include the risks raised by others in the acceptance criteria.`) : ""}${topic && round === 1 ? (zh ? ` 这适用于讨论“${topic.slice(0, 60)}”时的起步判断。` : ` This is an initial approach to “${topic.slice(0, 60)}”.`) : ""}`;
}
