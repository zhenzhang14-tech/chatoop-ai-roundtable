let DEFAULT_MODELS = [
  {
    id: `claude`,
    name: `Claude Sonnet`,
    company: `Anthropic`,
    color: `#F59E0B`,
    symbol: `Cl`,
    logoUrl: `/model-logos/anthropic.svg`,
    cost: `$$$`,
    tags: [`writing`, `risk`],
  },
  {
    id: `gemini`,
    name: `Gemini Flash`,
    company: `Google`,
    color: `#A78BFA`,
    symbol: `Gm`,
    logoUrl: `/model-logos/google.svg`,
    cost: `$`,
    tags: [`fast`, `broad`],
  },
  {
    id: `gpt4o`,
    name: `GPT-4o`,
    company: `OpenAI`,
    color: `#10B981`,
    symbol: `G4`,
    logoUrl: `/model-logos/openai.svg`,
    cost: `$$`,
    tags: [`reasoning`, `structured`],
  },
  {
    id: `deepseek`,
    name: `DeepSeek`,
    company: `DeepSeek AI`,
    color: `#60A5FA`,
    symbol: `DS`,
    logoUrl: `/model-logos/deepseek.webp`,
    cost: `$`,
    tags: [`direct`, `low cost`],
  },
  {
    id: `llama`,
    name: `Llama`,
    company: `Meta`,
    color: `#F472B6`,
    symbol: `Lm`,
    logoUrl: `/model-logos/meta.svg`,
    cost: `$$`,
    tags: [`open`, `balanced`],
  },
];
let COMING_SOON_MODELS = [
  {
    name: `Kimi K2.6`,
    company: `Moonshot AI`,
    symbol: `KM`,
  },
  {
    name: `Perplexity Sonar Pro`,
    company: `Perplexity`,
    symbol: `PX`,
  },
  {
    name: `Claude Haiku 4.5`,
    company: `Anthropic`,
    symbol: `AI`,
  },
  {
    name: `Claude Opus 4.7`,
    company: `Anthropic`,
    symbol: `AI`,
  },
  {
    name: `Claude Opus 4.6`,
    company: `Anthropic`,
    symbol: `AI`,
  },
  {
    name: `Claude Sonnet 4.6`,
    company: `Anthropic`,
    symbol: `AI`,
  },
  {
    name: `Grok 4.3`,
    company: `xAI`,
    symbol: `X`,
  },
  {
    name: `Qwen Max`,
    company: `Alibaba`,
    symbol: `Q`,
  },
];
let BRAND_ORDER = [
  `#F59E0B`,
  `#A78BFA`,
  `#10B981`,
  `#60A5FA`,
  `#F472B6`,
  `#14B8A6`,
  `#EF4444`,
  `#6366F1`,
];
let MODEL_PREVIEW_COUNT = 8;
let MODEL_EXPANDED_COUNT = 72;
let MODEL_BRANDS = [
  [
    /anthropic|claude|opus|sonnet|haiku/i,
    `Anthropic`,
    `A`,
    `/model-logos/anthropic.svg`,
  ],
  [/openai|gpt|chatgpt|^o[1345]\b/i, `OpenAI`, `O`, `/model-logos/openai.svg`],
  [
    /google|gemini|gemma|nano banana/i,
    `Google`,
    `G`,
    `/model-logos/google.svg`,
  ],
  [/\bxai\b|x-ai|grok/i, `xAI`, `X`, `/model-logos/xai.svg`],
  [/deepseek/i, `DeepSeek`, `DS`, `/model-logos/deepseek.webp`],
  [/moonshot|kimi/i, `Moonshot AI`, `K`, `/model-logos/moonshot.svg`],
  [/perplexity|sonar/i, `Perplexity`, `P`, `/model-logos/perplexity.svg`],
  [/\bqwen\b|alibaba/i, `Qwen`, `Q`, `/model-logos/qwen.webp`],
  [/\bz\.?ai\b|glm/i, `Z.ai`, `Z`, `/model-logos/zai.svg`],
  [/mistral/i, `Mistral AI`, `M`, `/model-logos/mistral.png`],
  [/\bmeta\b|llama/i, `Meta`, `M`, `/model-logos/meta.svg`],
  [/minimax/i, `MiniMax`, `MM`, `/model-logos/minimax.webp`],
  [/nemotron|nvidia/i, `NVIDIA`, `N`, `/model-logos/nemotron.svg`],
  [/arcee|trinity/i, `Arcee AI`, `A`, `/model-logos/arcee.webp`],
  [/intellect/i, `Prime Intellect`, `PI`, `/model-logos/intellect.svg`],
  [/talkie|opper/i, `Talkie`, `T`, `/model-logos/talkie.webp`],
];
function modelInitials(e) {
  let t = String(e || `AI`)
    .split(/[\s/_:-]+/)
    .filter(Boolean);
  return (
    t.length >= 2 ? `${t[0][0]}${t[1][0]}` : String(e || `AI`).slice(0, 2)
  ).toUpperCase();
}
function findModelBrand(e, t) {
  let n = [
      e?.id,
      e?.displayName,
      e?.name,
      e?.company,
      e?.providerName,
      e?.providerId,
      t,
    ]
      .filter(Boolean)
      .join(` `),
    r = MODEL_BRANDS.find(([e]) => e.test(n));
  return r
    ? {
        company: r[1],
        symbol: r[2],
        logoUrl: r[3],
      }
    : null;
}
function normalizeRuntimeModels(e) {
  return Array.isArray(e)
    ? e
        .map((e, t) => {
          let n = String(e.displayName || e.name || e.id || ``).trim(),
            r = String(e.id || ``).trim();
          if (!r || !n) return null;
          let i = DEFAULT_MODELS.find((e) => e.id === r || e.name === n),
            a = findModelBrand(e, n);
          return {
            id: r,
            name: n,
            company:
              e.company ||
              a?.company ||
              e.providerName ||
              i?.company ||
              (e.source === `legacy` ? `OpenRouter` : `Provider`),
            providerName: e.providerName || e.providerId || ``,
            logoUrl: e.logoUrl || a?.logoUrl || i?.logoUrl || ``,
            color: i?.color || BRAND_ORDER[t % BRAND_ORDER.length],
            symbol: e.symbol || a?.symbol || i?.symbol || modelInitials(n),
            cost: i?.cost || `$`,
            tags:
              Array.isArray(e.tags) && e.tags.length ? e.tags : i?.tags || [],
            contextLen: e.contextLen || 0,
            source: e.source || `registry`,
          };
        })
        .filter(Boolean)
        .filter((e, t, n) => n.findIndex((t) => t.id === e.id) === t)
    : [];
}
export {
  DEFAULT_MODELS,
  COMING_SOON_MODELS,
  BRAND_ORDER,
  MODEL_PREVIEW_COUNT,
  MODEL_EXPANDED_COUNT,
  MODEL_BRANDS,
  modelInitials,
  findModelBrand,
  normalizeRuntimeModels,
};
