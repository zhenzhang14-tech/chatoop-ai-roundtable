import {
  flag,
  configuredCatalog,
  publicConfiguredModels,
  mockReply,
} from "./runtime.js";
// AI Roundtable — Cloudflare Worker
// Proxies OpenRouter API, handles CORS, stores sessions in KV

const DEFAULT_SITE_URL = "http://127.0.0.1:5180";
const MAX_MODELS = 8;
const MAX_TOPIC_CHARS = 4000;
const MAX_MESSAGE_CHARS = 65536;
const MAX_CONTEXT_CHARS = 131072;
const MAX_SYSTEM_CHARS = 3000;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 120;
const LOGIN_LOCK_WINDOW_SECONDS = 15 * 60;
const LOGIN_LOCK_MAX_FAILURES = 5;
export default {
  async fetch(request, env) {
    try {
      if (
        request.method !== "GET" &&
        request.method !== "HEAD" &&
        !isAllowedOrigin(request, env)
      )
        return error("Origin is not allowed", 403, request, env);
      const requestURL = new URL(request.url);
      if (requestURL.pathname === "/api/health")
        return json(
          {
            status: "ok",
            mock: flag(env.MOCK_MODE),
            registrationEnabled: flag(env.ENABLE_REGISTRATION),
            billingEnabled: false,
            passwordResetEnabled: false,
            persistentStorage: !!(env.SESSIONS || env.DB),
          },
          200,
          request,
          env,
        );
      if (!requestURL.pathname.startsWith("/api/"))
        return env.ASSETS
          ? env.ASSETS.fetch(request)
          : new Response("ChatOOP AI Roundtable API", {
              status: 200,
            });
      if (Number(request.headers.get("Content-Length") || 0) > 256000)
        return error("Request is too large", 413, request, env);
      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        if (!isAllowedOrigin(request, env)) {
          return new Response(null, {
            status: 403,
            headers: corsHeaders(request, env),
          });
        }
        return new Response(null, {
          headers: corsHeaders(request, env),
        });
      }
      const url = new URL(request.url);

      // Auth + admin + public-models routes (returns a Response or null)
      const authAdminResp = await routeAuthAndAdmin(url, request, env);
      if (authAdminResp) return authAdminResp;

      // ── Routes ────────────────────────────────────────────
      if (url.pathname === "/api/chat" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleChat(request, env);
      }
      if (url.pathname === "/api/chat/stream" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleChatStream(request, env);
      }
      if (url.pathname === "/api/roundtable" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleRoundtable(request, env);
      }
      if (url.pathname === "/api/vote" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleVote(request, env);
      }
      if (url.pathname === "/api/summary" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleSummary(request, env);
      }
      if (url.pathname === "/api/synthesize" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleSynthesize(request, env);
      }
      if (
        url.pathname.startsWith("/api/session/") &&
        request.method === "GET"
      ) {
        return handleGetSession(request, env, url);
      }
      // ── Public roundtable discussions feed ──────────────────
      if (url.pathname === "/api/discussions" && request.method === "GET") {
        return handleListDiscussions(request, env, url);
      }
      if (url.pathname === "/api/stats" && request.method === "GET") {
        return handleStats(request, env);
      }
      if (url.pathname === "/api/discussions" && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handlePublishDiscussion(request, env);
      }
      const upvoteMatch = url.pathname.match(
        /^\/api\/discussions\/([^/]+)\/upvote$/,
      );
      if (upvoteMatch && request.method === "POST") {
        const gate = await guardRequest(request, env);
        if (gate) return gate;
        return handleUpvoteDiscussion(
          request,
          env,
          decodeURIComponent(upvoteMatch[1]),
          url,
        );
      }
      const getDiscussionMatch = url.pathname.match(
        /^\/api\/discussions\/([^/]+)$/,
      );
      if (getDiscussionMatch && request.method === "GET") {
        return handleGetDiscussion(
          request,
          env,
          decodeURIComponent(getDiscussionMatch[1]),
        );
      }
      if (url.pathname === "/api/health") {
        return json(
          {
            status: "ok",
            ts: Date.now(),
          },
          200,
          request,
          env,
        );
      }
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders(request, env),
      });
    } catch (failure) {
      return error(
        failure instanceof SyntaxError
          ? "Invalid JSON request"
          : "The API request could not be completed",
        failure instanceof SyntaxError ? 400 : 500,
        request,
        env,
      );
    }
  },
};

// ── /api/chat ─────────────────────────────────────────────
// Single model reply
async function handleChat(request, env) {
  try {
    const { model, system, messages, sessionId } = await request.json();
    const MODEL_RUNTIME = await getRuntimeCatalog(env);
    if (!model || !messages)
      return error("Missing model or messages", 400, request, env);
    if (!MODEL_RUNTIME[model])
      return error("Unknown model id", 400, request, env);
    if (typeof system === "string" && system.length > MAX_SYSTEM_CHARS) {
      return error("System prompt is too long", 400, request, env);
    }
    const validation = validateMessages(messages);
    if (validation) return error(validation, 400, request, env);
    const runtime = MODEL_RUNTIME[model];
    const effectiveSystem = system || runtime.system;
    const result = await callRuntimeModel(
      env,
      runtime,
      effectiveSystem,
      messages,
    );

    // Save to session if provided
    if (sessionId) {
      await saveToSession(env, sessionId, {
        role: "assistant",
        model,
        content: result.reply,
      });
    }
    return json(
      {
        reply: result.reply,
        modelUsed: result.modelUsed,
        fallbackUsed: result.fallbackUsed,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleChatStream(request, env) {
  try {
    const { model, system, messages } = await request.json();
    const MODEL_RUNTIME = await getRuntimeCatalog(env);
    if (!model || !messages)
      return error("Missing model or messages", 400, request, env);
    if (!MODEL_RUNTIME[model])
      return error("Unknown model id", 400, request, env);
    if (typeof system === "string" && system.length > MAX_SYSTEM_CHARS) {
      return error("System prompt is too long", 400, request, env);
    }
    const validation = validateMessages(messages);
    if (validation) return error(validation, 400, request, env);
    const runtime = MODEL_RUNTIME[model];
    const effectiveSystem = system || runtime.system;
    return streamRuntimeModel(env, runtime, effectiveSystem, messages, request);
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── /api/roundtable ───────────────────────────────────────
// All selected models respond sequentially
async function handleRoundtable(request, env) {
  try {
    const { topic, models, mode, sessionId } = await request.json();
    const MODEL_RUNTIME = await getRuntimeCatalog(env);
    const validation = validateTopicAndModels(topic, models, MODEL_RUNTIME);
    if (validation) return error(validation, 400, request, env);
    const results = [];
    for (const modelId of models) {
      const runtime = MODEL_RUNTIME[modelId];
      if (!runtime) continue;
      const prior = results
        .map((r) => `[${r.modelName}]: ${r.content}`)
        .join("\n\n");
      const userMsg = prior
        ? `Topic: "${topic}"\n\nOther panelists:\n${prior}\n\nAdd your perspective.`
        : `Topic: "${topic}"\n\nShare your view concisely.`;
      const result = await callRuntimeModel(env, runtime, runtime.system, [
        {
          role: "user",
          content: userMsg,
        },
      ]);
      results.push({
        modelId,
        modelName: runtime.name,
        content: result.reply,
        modelUsed: result.modelUsed,
        fallbackUsed: result.fallbackUsed,
      });
    }

    // Persist session
    if (sessionId) {
      await env.SESSIONS.put(
        `session:${sessionId}`,
        JSON.stringify({
          topic,
          models,
          results,
          createdAt: Date.now(),
        }),
        {
          expirationTtl: 86400,
        },
      );
    }
    return json(
      {
        results,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── /api/vote ─────────────────────────────────────────────
async function handleVote(request, env) {
  try {
    const { topic, models, context, options, round1Votes, language } =
      await request.json();
    const MODEL_RUNTIME = await getRuntimeCatalog(env);
    const validation =
      validateTopicAndModels(topic, models, MODEL_RUNTIME) ||
      validateContext(context);
    if (validation) return error(validation, 400, request, env);
    const requestedOptions = normalizeVoteOptions(options);
    if (options && requestedOptions.length < 2) {
      return error("Provide at least two vote options", 400, request, env);
    }
    const lang = normalizeVoteLanguage(language);
    const voteOptions = requestedOptions.length
      ? requestedOptions
      : ["YES", "NO"];
    const votes = [];
    const optionText = voteOptions
      .map((option, index) => `${String.fromCharCode(65 + index)}: ${option}`)
      .join(" | ");
    const reasonLanguage = lang === "zh" ? "Simplified Chinese" : "English";
    for (const modelId of models) {
      const runtime = MODEL_RUNTIME[modelId];
      if (!runtime) continue;
      const sys =
        runtime.system +
        `\n\nVote options: ${optionText}\n` +
        `Return JSON only, with no markdown and no extra text. The JSON schema is:\n` +
        `{"vote":"one exact option label or exact option text from the vote options","reason":"one sentence in ${reasonLanguage}"}\n` +
        `For custom options, prefer the option label (A, B, C...) or the exact option text. Never answer YES or NO unless YES or NO is one of the listed options.\n` +
        `The reason must directly answer the topic and must be written in ${reasonLanguage}.\n` +
        `Do not abstain. If uncertain, choose the closer option.`;
      const votePrompt = `Discussion about "${topic}":\n${context}\n\nCast your vote.`;
      let result = await callRuntimeModel(env, runtime, sys, [
        {
          role: "user",
          content: votePrompt,
        },
      ]);
      let parsed = parseVoteReply(result.reply);
      if (shouldRetryVoteReply(result.reply, parsed)) {
        try {
          const retryResult = await callRuntimeModel(env, runtime, sys, [
            {
              role: "user",
              content: votePrompt,
            },
            {
              role: "assistant",
              content: result.reply,
            },
            {
              role: "user",
              content:
                `Your previous JSON was incomplete. Return one complete JSON object only. ` +
                `Use exactly one vote option from: ${optionText}. ` +
                `Keep the reason one complete sentence in ${reasonLanguage}.`,
            },
          ]);
          const retryParsed = parseVoteReply(retryResult.reply);
          if (retryParsed.vote || retryParsed.reason) {
            result = {
              ...retryResult,
              fallbackUsed: Boolean(
                result.fallbackUsed || retryResult.fallbackUsed,
              ),
            };
            parsed = retryParsed;
          }
        } catch {}
      }
      const rawVote = String(parsed.vote || "").trim();
      const matchedOption = matchVoteOption(rawVote, voteOptions);
      const finalVote = matchedOption || "INVALID";
      const reason = sanitizeVoteReason(parsed.reason || result.reply, lang);
      const round1 = Array.isArray(round1Votes)
        ? round1Votes.find(
            (v) => v.modelId === modelId || v.modelName === runtime.name,
          )
        : null;
      const round1Vote = String(round1?.vote || finalVote).trim();
      votes.push({
        modelId,
        modelName: runtime.name,
        round1Vote,
        finalVote,
        vote: finalVote,
        flipped: round1Vote.toUpperCase() !== finalVote.toUpperCase(),
        reason,
        status: matchedOption ? "ok" : "invalid",
        modelUsed: result.modelUsed,
        fallbackUsed: result.fallbackUsed,
      });
    }
    return json(
      {
        votes: analyzeVotesForStats(votes).votes,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── /api/summary ──────────────────────────────────────────
async function handleSummary(request, env) {
  try {
    const { topic, context, votes } = await request.json();
    if (validateText(topic, "Topic", MAX_TOPIC_CHARS)) {
      return error(
        validateText(topic, "Topic", MAX_TOPIC_CHARS),
        400,
        request,
        env,
      );
    }
    const contextValidation = validateContext(context);
    if (contextValidation) return error(contextValidation, 400, request, env);
    const voteCtx = votes?.length
      ? "\n\nVotes:\n" +
        votes.map((v) => `${v.modelName}: ${v.vote} — ${v.reason}`).join("\n")
      : "";
    const summaryRuntime = await getSummaryRuntime(env);
    const result = await callRuntimeModel(
      env,
      summaryRuntime,
      "You are a professional meeting secretary. Write a concise, structured summary. Surface genuine disagreement, risks, and uncertainty. Do NOT present a single overconfident conclusion when the panel did not actually agree.",
      [
        {
          role: "user",
          content: `Summarize this AI Roundtable.\n\nTopic: "${topic}"\n\n${context}${voteCtx}\n\nUse exactly this format (keep each section, use "- none noted" if empty):\n## Meeting Summary\n**Topic:** ...\n\n**Key Points:**\n- ...\n\n**Agreement:**\n- ...\n\n**Disagreement:**\n- ...\n\n**Risks:**\n- ...\n\n**Next Steps:**\n- ...\n\n**Fresh Angles:**\n- ...\n\n**Confidence & Uncertainty:** One or two sentences on how settled this conclusion is and what remains unknown or contested.`,
        },
      ],
    );
    return json(
      {
        summary: result.reply,
        modelUsed: result.modelUsed,
        fallbackUsed: result.fallbackUsed,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── /api/synthesize ───────────────────────────────────────
// Merge multiple panelist answers into one consolidated roundtable reply.
async function handleSynthesize(request, env) {
  try {
    const { topic, answers } = await request.json();
    const tv = validateText(topic, "Topic", MAX_TOPIC_CHARS);
    if (tv) return error(tv, 400, request, env);
    if (!Array.isArray(answers) || !answers.length) {
      return error("No panelist answers to synthesize", 400, request, env);
    }
    const panel = answers
      .map(
        (a) =>
          `[${String(a.modelName || a.modelId || "model").slice(0, 60)}]: ${String(a.content || "").slice(0, 4000)}`,
      )
      .join("\n\n")
      .slice(0, MAX_CONTEXT_CHARS);
    const summaryRuntime = await getSummaryRuntime(env);
    const result = await callRuntimeModel(
      env,
      summaryRuntime,
      "You are the moderator of an AI roundtable. Read the panelists' answers and write ONE consolidated reply in flowing prose that captures where they agree, briefly notes any genuine disagreement, and reads as a single coherent answer. Reference models by name where it adds clarity. Do not invent agreement that is not there. Reply in the same language as the question.",
      [
        {
          role: "user",
          content: `Question: "${topic}"\n\nPanelist answers:\n${panel}\n\nWrite the consolidated roundtable reply.`,
        },
      ],
    );
    return json(
      {
        reply: result.reply,
        modelUsed: result.modelUsed,
        fallbackUsed: result.fallbackUsed,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── /api/session/:id ──────────────────────────────────────
async function handleGetSession(request, env, url) {
  const id = url.pathname.split("/").pop();
  const data = await env.SESSIONS.get(`session:${id}`);
  if (!data) return error("Session not found", 404, request, env);
  return json(JSON.parse(data), 200, request, env);
}

// ── Public discussions feed (D1/R2 backed, KV fallback) ──────────────────
const DISCUSSIONS_INDEX_KEY = "discussions:index";
const MAX_DISCUSSIONS = 500;
const MAX_QUESTION_CHARS = 4000;
const MAX_SUMMARY_CHARS = 8000;
const MAX_TRANSCRIPT_ITEMS = 100;
const DISCUSSION_DETAIL_VERSION = "v1";
const DISCUSSION_CATEGORIES = [
  "Fun & Hypothetical",
  "Philosophy",
  "Ethics",
  "Technology",
  "Culture",
  "Business",
  "Politics",
  "Personal",
  "Other",
];
const CATEGORY_KEYWORDS = [
  [
    "Technology",
    [
      "ai",
      "model",
      "software",
      "code",
      "programming",
      "developer",
      "startup",
      "data",
      "privacy",
      "security",
      "robot",
      "automation",
      "internet",
      "algorithm",
      "app",
      "cloud",
      "tech",
      "人工智能",
      "模型",
      "软件",
      "代码",
      "编程",
      "开发",
      "数据",
      "隐私",
      "安全",
      "机器人",
      "自动化",
      "互联网",
      "算法",
      "应用",
      "云",
    ],
  ],
  [
    "Business",
    [
      "work",
      "job",
      "company",
      "business",
      "market",
      "product",
      "pricing",
      "customer",
      "management",
      "finance",
      "investment",
      "startup",
      "salary",
      "office",
      "remote",
      "productivity",
      "career",
      "工作",
      "职业",
      "公司",
      "商业",
      "市场",
      "产品",
      "定价",
      "客户",
      "管理",
      "财务",
      "投资",
      "创业",
      "工资",
      "办公室",
      "远程",
      "效率",
      "职场",
    ],
  ],
  [
    "Politics",
    [
      "government",
      "policy",
      "law",
      "election",
      "city",
      "public",
      "tax",
      "regulation",
      "school",
      "healthcare",
      "transit",
      "country",
      "state",
      "rights",
      "ban",
      "政府",
      "政策",
      "法律",
      "选举",
      "城市",
      "公共",
      "税",
      "监管",
      "学校",
      "医疗",
      "公交",
      "国家",
      "权利",
      "禁止",
    ],
  ],
  [
    "Ethics",
    [
      "should",
      "ethical",
      "moral",
      "fair",
      "justice",
      "harm",
      "safe",
      "responsible",
      "bias",
      "consent",
      "surveillance",
      "minimum age",
      "rights",
      "应该",
      "伦理",
      "道德",
      "公平",
      "正义",
      "伤害",
      "安全",
      "负责",
      "偏见",
      "同意",
      "监控",
      "年龄限制",
      "权利",
    ],
  ],
  [
    "Culture",
    [
      "book",
      "movie",
      "music",
      "art",
      "culture",
      "fiction",
      "non-fiction",
      "game",
      "sports",
      "food",
      "pizza",
      "language",
      "media",
      "fashion",
      "travel",
      "书",
      "电影",
      "音乐",
      "艺术",
      "文化",
      "小说",
      "游戏",
      "体育",
      "食物",
      "披萨",
      "语言",
      "媒体",
      "时尚",
      "旅行",
    ],
  ],
  [
    "Philosophy",
    [
      "meaning",
      "truth",
      "free will",
      "consciousness",
      "happiness",
      "exist",
      "life",
      "mind",
      "knowledge",
      "belief",
      "better life",
      "purpose",
      "意义",
      "真理",
      "自由意志",
      "意识",
      "幸福",
      "存在",
      "人生",
      "心灵",
      "知识",
      "信念",
      "目的",
    ],
  ],
  [
    "Personal",
    [
      "relationship",
      "family",
      "friend",
      "home",
      "house",
      "rent",
      "commute",
      "habit",
      "health",
      "fitness",
      "sleep",
      "study",
      "move",
      "personal",
      "money buy happiness",
      "关系",
      "家庭",
      "朋友",
      "家",
      "房子",
      "租房",
      "通勤",
      "习惯",
      "健康",
      "健身",
      "睡眠",
      "学习",
      "搬家",
      "个人",
    ],
  ],
  [
    "Fun & Hypothetical",
    [
      "would you rather",
      "hypothetical",
      "fun",
      "silly",
      "superpower",
      "alien",
      "zombie",
      "time travel",
      "pineapple",
      "tabs or spaces",
      "假如",
      "脑洞",
      "有趣",
      "超能力",
      "外星",
      "时间旅行",
      "菠萝",
      "披萨",
      "制表符",
      "空格",
    ],
  ],
];
const DISCUSSION_SEEDS = [];
function inferDiscussionCategory(question, context = "") {
  const text = `${question || ""} ${context || ""}`.toLowerCase();
  if (!text.trim()) return "Other";
  const scores = new Map();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      const needle = String(keyword).toLowerCase();
      if (needle && text.includes(needle)) {
        scores.set(
          category,
          (scores.get(category) || 0) +
            Math.max(1, Math.min(3, needle.length / 4)),
        );
      }
    }
  }
  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || "Other";
}
async function readIndex(env) {
  if (!env.SESSIONS) return [];
  const raw = await env.SESSIONS.get(DISCUSSIONS_INDEX_KEY);
  try {
    const a = JSON.parse(raw || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
async function writeIndex(env, list) {
  if (!env.SESSIONS) return;
  await env.SESSIONS.put(
    DISCUSSIONS_INDEX_KEY,
    JSON.stringify(list.slice(0, MAX_DISCUSSIONS)),
  );
}
async function resolveFallbackDiscussionId(env, idOrSlug, index = null) {
  const key = String(idOrSlug || "");
  if (!key) return "";
  const items = Array.isArray(index) ? index : await readIndex(env);
  const match = items.find((item) => item?.id === key || item?.slug === key);
  return match?.id || key;
}
function hasDurableDiscussionStore(env) {
  return Boolean(env.DB && env.DISCUSSION_DETAILS);
}
function discussionDetailKey(id) {
  return `discussions/${id}/${DISCUSSION_DETAIL_VERSION}.json`;
}
function slugifyQuestion(question, id) {
  const base = String(question || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return `${base || "discussion"}-${String(id).slice(-8)}`;
}
function rowToDiscussionEntry(row) {
  if (!row) return null;
  let modelNames;
  let votes;
  let voteStats;
  try {
    modelNames = JSON.parse(row.model_names_json || "[]");
  } catch {
    modelNames = [];
  }
  try {
    votes = JSON.parse(row.votes_json || "[]");
  } catch {
    votes = [];
  }
  try {
    voteStats = JSON.parse(row.vote_stats_json || "null");
  } catch {
    voteStats = null;
  }
  return {
    id: row.id,
    slug: row.slug,
    question: row.question || "",
    summary: row.summary || "",
    mode: row.mode || "vote",
    answerType: row.answer_type || "open",
    category: row.category || "Other",
    lang: row.lang || "en",
    source: row.source || "user_public",
    status: row.status || "published",
    authorId: row.author_id || "",
    models:
      Number(row.model_count) ||
      (Array.isArray(modelNames) ? modelNames.length : 0),
    modelNames: Array.isArray(modelNames) ? modelNames : [],
    upvotes: Number(row.upvotes) || 0,
    createdAt: Number(row.created_at) || 0,
    publishedAt: Number(row.published_at) || 0,
    detailR2Key: row.detail_r2_key || "",
    votes: Array.isArray(votes) ? votes : [],
    voteStats,
    imported: Boolean(row.imported),
  };
}
function d1WhereForDiscussions(params) {
  const where = ["status = ?"];
  const binds = ["published"];
  if (params.category) {
    where.push("category = ?");
    binds.push(params.category);
  }
  if (params.mode) {
    where.push("mode = ?");
    binds.push(params.mode);
  }
  if (params.lang) {
    where.push("lang = ?");
    binds.push(params.lang);
  }
  if (params.q) {
    where.push("question LIKE ?");
    binds.push(`%${params.q}%`);
  }
  return {
    whereSql: where.join(" AND "),
    binds,
  };
}
async function handleListDiscussionsD1(request, env, url) {
  const p = url.searchParams;
  const sort = (p.get("sort") || "hot").toLowerCase();
  const params = {
    category: p.get("category") || "",
    mode: (p.get("mode") || "").toLowerCase(),
    lang: (p.get("lang") || "").toLowerCase(),
    q: (p.get("q") || "").trim(),
  };
  const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(p.get("pageSize") || "20", 10) || 20),
  );
  const offset = (page - 1) * pageSize;
  const { whereSql, binds } = d1WhereForDiscussions(params);
  const orderSql =
    sort === "new" ? "published_at DESC" : "upvotes DESC, published_at DESC";
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM discussions WHERE ${whereSql}`,
  )
    .bind(...binds)
    .first();
  const rows = await env.DB.prepare(
    `SELECT * FROM discussions WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
  )
    .bind(...binds, pageSize, offset)
    .all();
  const items = (rows.results || [])
    .map(rowToDiscussionEntry)
    .filter(Boolean)
    .map((d) => ({
      ...d,
      modeLabel: modeLabelOf(d.mode, d.answerType),
    }));
  const total = Number(countRow?.total) || 0;
  return json(
    {
      items,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      categories: DISCUSSION_CATEGORIES,
      sort,
      source: "d1-r2",
    },
    200,
    request,
    env,
  );
}
async function findDiscussionRow(env, idOrSlug) {
  return env.DB.prepare(
    "SELECT * FROM discussions WHERE (id = ? OR slug = ?) AND status = ? LIMIT 1",
  )
    .bind(idOrSlug, idOrSlug, "published")
    .first();
}
async function readAllD1DiscussionMetadata(env, limit = 5000) {
  const rows = await env.DB.prepare(
    "SELECT * FROM discussions WHERE status = ? ORDER BY published_at DESC LIMIT ?",
  )
    .bind("published", limit)
    .all();
  return (rows.results || []).map(rowToDiscussionEntry).filter(Boolean);
}
function modeLabelOf(mode, answerType) {
  const open = answerType === "open";
  if (mode === "debate") return open ? "Open Debate" : "Debate";
  return open ? "Open Poll" : "Poll";
}
function seedDetailPayload(entry, seed) {
  const modelNames = seed?.models || entry.modelNames || [];
  const voteOptions =
    seed?.answerType === "yesno"
      ? ["YES", "NO"]
      : seed?.answerType === "custom"
        ? ["Tabs", "Spaces"]
        : [];
  const votes = voteOptions.length
    ? modelNames.map((modelName, i) => ({
        modelName,
        vote: voteOptions[i % voteOptions.length],
        reason: `${modelName} weighs the tradeoff and gives a concise position for this archived roundtable.`,
      }))
    : [];
  const transcript = modelNames.map((modelName, i) => ({
    modelName,
    content: `${modelName}: ${i === 0 ? "Frames the strongest argument and key uncertainty." : "Adds a different angle, caveat, or counterpoint."}`,
  }));
  const summary =
    entry.mode === "vote"
      ? `The archived poll shows ${votes.length} model votes with short reasons. The result is intentionally compact so the detail page stays easy to scan.`
      : "The archived debate captures competing model viewpoints and a concise synthesis of the strongest arguments on both sides.";
  return {
    ...entry,
    modelNames,
    models: modelNames.length || entry.models || 0,
    transcript,
    votes,
    summary,
  };
}
async function ensureSeed(env) {}
async function handleListDiscussions(request, env, url) {
  try {
    if (hasDurableDiscussionStore(env)) {
      return handleListDiscussionsD1(request, env, url);
    }
    await ensureSeed(env);
    const p = url.searchParams;
    const sort = (p.get("sort") || "hot").toLowerCase();
    const category = p.get("category") || "";
    const mode = (p.get("mode") || "").toLowerCase();
    const lang = (p.get("lang") || "").toLowerCase();
    const q = (p.get("q") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(p.get("pageSize") || "20", 10) || 20),
    );
    let items = await readIndex(env);
    if (category) items = items.filter((d) => d.category === category);
    if (mode) items = items.filter((d) => d.mode === mode);
    if (lang) items = items.filter((d) => (d.lang || "en") === lang);
    if (q)
      items = items.filter((d) => (d.question || "").toLowerCase().includes(q));
    if (sort === "new") {
      items.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      // hot: upvotes weighted with mild recency decay
      const now = Date.now();
      const score = (d) =>
        (d.upvotes || 0) + 12 / (1 + (now - d.createdAt) / (24 * 3600 * 1000));
      items.sort((a, b) => score(b) - score(a));
    }
    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize).map((d) => ({
      ...d,
      modeLabel: modeLabelOf(d.mode, d.answerType),
    }));
    return json(
      {
        items: pageItems,
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
        categories: DISCUSSION_CATEGORIES,
        sort,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handlePublishDiscussion(request, env) {
  try {
    if (hasDurableDiscussionStore(env)) {
      return handlePublishDiscussionD1(request, env);
    }
    if (!env.SESSIONS)
      return error("Discussion storage is not configured", 503, request, env);
    const body = await request.json();
    const question = String(body.question || "").trim();
    const v = validateText(question, "Question", MAX_QUESTION_CHARS);
    if (v) return error(v, 400, request, env);
    const mode = body.mode === "debate" ? "debate" : "vote";
    const answerType = ["open", "yesno", "custom"].includes(body.answerType)
      ? body.answerType
      : "open";
    const requestedCategory = DISCUSSION_CATEGORIES.includes(body.category)
      ? body.category
      : "Other";
    const categoryContext = `${body.summary || ""} ${Array.isArray(body.transcript) ? body.transcript.map((m) => m?.content || "").join(" ") : ""}`;
    const category =
      requestedCategory !== "Other"
        ? requestedCategory
        : inferDiscussionCategory(question, categoryContext);
    const lang = body.lang === "zh" ? "zh" : "en";
    const modelNames = Array.isArray(body.modelNames)
      ? body.modelNames.map((m) => String(m).slice(0, 60)).slice(0, 8)
      : [];
    const analyzedVotes = analyzeVotesForStats(body.votes);
    const voteOptions = Array.isArray(body.voteOptions)
      ? body.voteOptions
          .slice(0, 6)
          .map((o) => String(o).trim())
          .filter(Boolean)
      : [];
    const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const slug = slugifyQuestion(question, id);
    const createdAt = Date.now();
    const summary = String(body.summary || "").slice(0, 8000);
    const publicUrl = `/ai-roundtable/questions/${slug || id}`;
    const entry = {
      id,
      slug,
      question,
      summary,
      mode,
      answerType,
      category,
      lang,
      models: modelNames.length,
      modelNames,
      upvotes: 0,
      createdAt,
      publishedAt: createdAt,
      publicUrl,
      voteStats: analyzedVotes.voteStats,
      votes: analyzedVotes.votes,
      ...(voteOptions.length
        ? {
            voteOptions,
          }
        : {}),
    };
    const index = await readIndex(env);
    index.unshift(entry);
    await writeIndex(env, index);
    await env.SESSIONS.put(
      `discussion:${id}`,
      JSON.stringify({
        ...entry,
        transcript: Array.isArray(body.transcript)
          ? body.transcript.slice(0, 100)
          : [],
        summary,
        votes: analyzedVotes.votes,
      }),
    );
    return json(
      {
        id,
        slug,
        url: publicUrl,
        publicUrl,
        entry: {
          ...entry,
          modeLabel: modeLabelOf(mode, answerType),
        },
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handlePublishDiscussionD1(request, env) {
  const body = await request.json();
  const question = String(body.question || "").trim();
  const v = validateText(question, "Question", MAX_QUESTION_CHARS);
  if (v) return error(v, 400, request, env);
  const mode = body.mode === "debate" ? "debate" : "vote";
  const answerType = ["open", "yesno", "custom"].includes(body.answerType)
    ? body.answerType
    : "open";
  const requestedCategory = DISCUSSION_CATEGORIES.includes(body.category)
    ? body.category
    : "Other";
  const transcript = Array.isArray(body.transcript)
    ? body.transcript.slice(0, MAX_TRANSCRIPT_ITEMS)
    : [];
  const summary = String(body.summary || "").slice(0, MAX_SUMMARY_CHARS);
  const categoryContext = `${summary} ${transcript.map((m) => m?.content || "").join(" ")}`;
  const category =
    requestedCategory !== "Other"
      ? requestedCategory
      : inferDiscussionCategory(question, categoryContext);
  const lang = body.lang === "zh" ? "zh" : "en";
  const modelNames = Array.isArray(body.modelNames)
    ? body.modelNames
        .map((m) => String(m).slice(0, 60))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const analyzedVotes = analyzeVotesForStats(body.votes);
  const voteOptions = Array.isArray(body.voteOptions)
    ? body.voteOptions
        .slice(0, 6)
        .map((o) => String(o).trim())
        .filter(Boolean)
    : [];
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : `d_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const slug = slugifyQuestion(question, id);
  const createdAt = Date.now();
  const detailR2Key = discussionDetailKey(id);
  const entry = {
    id,
    slug,
    question,
    mode,
    answerType,
    category,
    lang,
    source: "user_public",
    status: "published",
    authorId: "",
    models: modelNames.length,
    modelNames,
    upvotes: 0,
    createdAt,
    publishedAt: createdAt,
    detailR2Key,
    voteStats: analyzedVotes.voteStats,
  };
  const detail = {
    ...entry,
    transcript,
    summary,
    votes: analyzedVotes.votes,
    voteOptions: voteOptions.length ? voteOptions : undefined,
    schemaVersion: 1,
  };
  await env.DISCUSSION_DETAILS.put(detailR2Key, JSON.stringify(detail), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
    customMetadata: {
      discussionId: id,
      slug,
    },
  });
  try {
    await env.DB.prepare(
      `INSERT INTO discussions (
        id, slug, question, summary, mode, answer_type, category, lang, source, status,
        author_id, model_count, model_names_json, upvotes, created_at, published_at,
        detail_r2_key, vote_stats_json, votes_json, imported
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        slug,
        question,
        summary,
        mode,
        answerType,
        category,
        lang,
        "user_public",
        "published",
        "",
        modelNames.length,
        JSON.stringify(modelNames),
        0,
        createdAt,
        createdAt,
        detailR2Key,
        JSON.stringify(analyzedVotes.voteStats),
        JSON.stringify(analyzedVotes.votes),
        0,
      )
      .run();
  } catch (e) {
    await env.DISCUSSION_DETAILS.delete(detailR2Key).catch(() => null);
    throw e;
  }
  const publicUrl = `/ai-roundtable/questions/${slug || id}`;
  return json(
    {
      id,
      slug,
      url: publicUrl,
      publicUrl,
      entry: {
        ...entry,
        modeLabel: modeLabelOf(mode, answerType),
        publicUrl,
      },
    },
    200,
    request,
    env,
  );
}
async function handleUpvoteDiscussion(request, env, id) {
  try {
    if (hasDurableDiscussionStore(env)) {
      const row = await findDiscussionRow(env, id);
      if (!row) return error("Discussion not found", 404, request, env);
      await env.DB.prepare(
        "UPDATE discussions SET upvotes = upvotes + 1, updated_at = ? WHERE id = ?",
      )
        .bind(Date.now(), row.id)
        .run();
      const next = await findDiscussionRow(env, row.id);
      return json(
        {
          id: next.id,
          slug: next.slug,
          upvotes: Number(next.upvotes) || 0,
        },
        200,
        request,
        env,
      );
    }
    if (!env.SESSIONS)
      return error("Discussion storage is not configured", 503, request, env);
    const index = await readIndex(env);
    const canonicalId = await resolveFallbackDiscussionId(env, id, index);
    const i = index.findIndex((d) => d.id === canonicalId);
    if (i === -1) return error("Discussion not found", 404, request, env);
    index[i].upvotes = (index[i].upvotes || 0) + 1;
    await writeIndex(env, index);
    const recRaw = await env.SESSIONS.get(`discussion:${canonicalId}`);
    if (recRaw) {
      const rec = JSON.parse(recRaw);
      rec.upvotes = index[i].upvotes;
      await env.SESSIONS.put(`discussion:${canonicalId}`, JSON.stringify(rec));
    }
    return json(
      {
        id: canonicalId,
        slug: index[i].slug,
        upvotes: index[i].upvotes,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleGetDiscussion(request, env, id) {
  if (hasDurableDiscussionStore(env)) {
    const row = await findDiscussionRow(env, id);
    if (!row) return error("Discussion not found", 404, request, env);
    const meta = rowToDiscussionEntry(row);
    const object = meta.detailR2Key
      ? await env.DISCUSSION_DETAILS.get(meta.detailR2Key)
      : null;
    if (!object) return error("Discussion detail not found", 404, request, env);
    const detail = await object.json();
    return json(
      {
        ...detail,
        ...meta,
        transcript: Array.isArray(detail.transcript) ? detail.transcript : [],
        votes: Array.isArray(detail.votes) ? detail.votes : [],
        modeLabel: modeLabelOf(
          detail.mode || meta.mode,
          detail.answerType || meta.answerType,
        ),
      },
      200,
      request,
      env,
    );
  }
  const index = env.SESSIONS ? await readIndex(env) : [];
  const canonicalId = await resolveFallbackDiscussionId(env, id, index);
  const raw = env.SESSIONS
    ? await env.SESSIONS.get(`discussion:${canonicalId}`)
    : null;
  if (!raw) return error("Discussion not found", 404, request, env);
  const rec = JSON.parse(raw);
  const seedIndex = String(canonicalId || "").startsWith("seed_")
    ? Number(String(canonicalId).replace("seed_", "")) - 1
    : -1;
  const seed = DISCUSSION_SEEDS[seedIndex];
  const hydrated =
    seed &&
    (!Array.isArray(rec.transcript) || rec.transcript.length === 0) &&
    (!Array.isArray(rec.votes) || rec.votes.length === 0) &&
    !rec.summary
      ? seedDetailPayload(rec, seed)
      : rec;
  const indexEntry = index.find((item) => item.id === canonicalId) || {};
  return json(
    {
      ...hydrated,
      slug: hydrated.slug || indexEntry.slug,
      publicUrl:
        hydrated.publicUrl ||
        indexEntry.publicUrl ||
        `/ai-roundtable/questions/${encodeURIComponent(hydrated.slug || indexEntry.slug || canonicalId)}`,
      modeLabel: modeLabelOf(hydrated.mode, hydrated.answerType),
    },
    200,
    request,
    env,
  );
}
function statsWindowStart(windowValue) {
  const now = Date.now();
  if (windowValue === "24h") return now - 24 * 3600 * 1000;
  if (windowValue === "7d") return now - 7 * 24 * 3600 * 1000;
  return 0;
}
function consensusBucketFromVotes(votes, modelsCount) {
  const total = Math.max(0, votes?.length || modelsCount || 0);
  if (!total) return "No vote";
  const counts = new Map();
  for (const vote of votes || []) {
    const key = String(vote.finalVote || vote.vote || "INVALID").toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const top = Math.max(0, ...counts.values());
  const ratio = top / total;
  if (ratio >= 1) return "Unanimous";
  if (ratio >= 0.75) return "Strong majority";
  if (ratio > 0.5) return "Majority";
  return "No consensus";
}
function analyzeVotesForStats(votes) {
  const normalized = Array.isArray(votes)
    ? votes.slice(0, 20).map((vote) => {
        const finalVote =
          String(vote.finalVote || vote.vote || "INVALID").trim() || "INVALID";
        const round1Vote =
          String(
            vote.round1Vote || vote.firstVote || vote.initialVote || finalVote,
          ).trim() || finalVote;
        return {
          ...vote,
          round1Vote,
          finalVote,
          vote: finalVote,
          flipped: Boolean(
            vote.flipped ??
            round1Vote.toUpperCase() !== finalVote.toUpperCase(),
          ),
        };
      })
    : [];
  const counts = new Map();
  for (const vote of normalized) {
    const key = String(vote.finalVote || "INVALID").toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const maxCount = Math.max(0, ...counts.values());
  const winners = new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count === maxCount && maxCount > 0)
      .map(([key]) => key),
  );
  const votesWithWinSide = normalized.map((vote) => ({
    ...vote,
    onWinningSide:
      vote.onWinningSide ??
      winners.has(String(vote.finalVote || "INVALID").toUpperCase()),
  }));
  return {
    votes: votesWithWinSide,
    voteStats: {
      totalVotes: votesWithWinSide.length,
      flippedCount: votesWithWinSide.filter((vote) => vote.flipped).length,
      winningVotes: votesWithWinSide.filter((vote) => vote.onWinningSide)
        .length,
      consensus: consensusBucketFromVotes(
        votesWithWinSide,
        votesWithWinSide.length,
      ),
    },
  };
}
function computeStatsPayload(items, windowValue) {
  const start = statsWindowStart(windowValue);
  const scoped = start
    ? items.filter((item) => (item.createdAt || 0) >= start)
    : items;
  const tally = (list, keyFn) => {
    const map = new Map();
    for (const item of list) {
      const key = keyFn(item) || "Other";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  };
  const modelMap = new Map();
  let responseCount = 0;
  for (const item of scoped) {
    responseCount += Number(item.models) || 0;
    const names =
      Array.isArray(item.modelNames) && item.modelNames.length
        ? item.modelNames
        : [`${item.models || 0} selected models`];
    for (const name of names) modelMap.set(name, (modelMap.get(name) || 0) + 1);
  }
  const modelUsage = Array.from(modelMap.entries())
    .map(([model, count]) => ({
      model,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const modes = tally(scoped, (item) =>
    modeLabelOf(item.mode, item.answerType),
  );
  const categories = tally(scoped, (item) => item.category);
  const languages = tally(scoped, (item) => (item.lang || "en").toUpperCase());
  const consensusOutcomes = tally(scoped, (item) =>
    consensusBucketFromVotes(item.votes, item.models),
  );
  const voteRows = scoped.flatMap(
    (item) => analyzeVotesForStats(item.votes).votes,
  );
  const byModel = new Map();
  for (const vote of voteRows) {
    const key = vote.modelName || vote.modelId || "Model";
    const cur = byModel.get(key) || {
      model: key,
      count: 0,
      flips: 0,
      kept: 0,
      wins: 0,
    };
    cur.count += 1;
    if (vote.flipped) cur.flips += 1;
    else cur.kept += 1;
    if (vote.onWinningSide) cur.wins += 1;
    byModel.set(key, cur);
  }
  const modelVoteStats = Array.from(byModel.values());
  const categoryConsensus = categories.map((cat) => {
    const rows = scoped.filter(
      (item) => (item.category || "Other") === cat.label,
    );
    const consensus = rows.filter(
      (item) =>
        !["No consensus", "No vote"].includes(
          consensusBucketFromVotes(item.votes, item.models),
        ),
    ).length;
    return {
      label: cat.label,
      count: cat.count,
      consensusRate: rows.length
        ? Math.round((consensus / rows.length) * 100)
        : 0,
    };
  });
  const mostInfluentialModels = modelVoteStats
    .map((row) => ({
      model: row.model,
      flips: row.flips,
      count: row.count,
    }))
    .sort((a, b) => b.flips - a.flips || b.count - a.count);
  const conviction = modelVoteStats
    .map((row) => ({
      model: row.model,
      keptRate: row.count ? Math.round((row.kept / row.count) * 100) : 0,
      count: row.count,
    }))
    .sort((a, b) => b.keptRate - a.keptRate || b.count - a.count);
  const mostPersuadable = modelVoteStats
    .map((row) => ({
      model: row.model,
      flipRate: row.count ? Math.round((row.flips / row.count) * 100) : 0,
      count: row.count,
    }))
    .sort((a, b) => b.flipRate - a.flipRate || b.count - a.count);
  const winRate = modelVoteStats
    .map((row) => ({
      model: row.model,
      count: row.count,
      winRate: row.count ? Math.round((row.wins / row.count) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.count - a.count);
  const highlights = {
    topMode: modes[0]?.label || "—",
    topCategory: categories[0]?.label || "—",
    mostUsedModel: modelUsage[0]?.model || "—",
    topLanguage: languages[0]?.label || "—",
    highestConviction: conviction[0]?.keptRate || 0,
    mostInfluentialModel: mostInfluentialModels[0]?.model || "—",
  };
  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 2,
    window: windowValue,
    totalSessions: {
      all: items.length,
      window: scoped.length,
    },
    responseCount,
    highlights,
    modelUsage,
    categories,
    languages,
    modes,
    consensusOutcomes,
    categoryConsensus,
    mostInfluentialModels,
    conviction,
    mostPersuadable,
    winRate,
    skippedDebateShare: scoped.length
      ? Math.round(
          (scoped.filter((item) => item.mode === "vote").length /
            scoped.length) *
            100,
        )
      : 0,
  };
}
async function handleStats(request, env) {
  try {
    const url = new URL(request.url);
    const windowValue = ["24h", "7d", "all"].includes(
      url.searchParams.get("window"),
    )
      ? url.searchParams.get("window")
      : "all";
    if (hasDurableDiscussionStore(env)) {
      const items = await readAllD1DiscussionMetadata(env);
      return json(computeStatsPayload(items, windowValue), 200, request, env);
    }
    if (!env.SESSIONS) {
      return json(computeStatsPayload([], windowValue), 200, request, env);
    }
    await ensureSeed(env);
    const items = await readIndex(env);
    return json(computeStatsPayload(items, windowValue), 200, request, env);
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── Thinking-model parameter helper ──────────────────────
// Returns { max_tokens, extra } for known reasoning/thinking models,
// or null for standard models.
// stream=true  → keep thinking enabled (streaming separates thinking tokens from output)
// stream=false → disable thinking (non-streaming shares max_tokens between thinking+output)
function getThinkingParams(modelId, stream = false) {
  const id = String(modelId || "");

  // Gemini 2.5 series (Flash / Pro)
  if (/gemini-2\.5|gemini-2-5/i.test(id)) {
    return stream
      ? {
          max_tokens: 16000,
          extra: {
            thinking: {
              budget_tokens: 10000,
            },
          },
        }
      : {
          max_tokens: 1000,
          extra: {
            thinking: {
              budget_tokens: 0,
            },
          },
        };
  }
  // Gemini 3.x series
  if (/gemini-3\./i.test(id)) {
    return stream
      ? {
          max_tokens: 16000,
          extra: {
            thinking: {
              budget_tokens: 10000,
            },
          },
        }
      : {
          max_tokens: 1000,
          extra: {
            thinking: {
              budget_tokens: 0,
            },
          },
        };
  }
  // Anthropic claude with extended thinking (claude-3.7+)
  if (/claude-3[-_.]7|claude-3-7/i.test(id)) {
    return stream
      ? {
          max_tokens: 16000,
          extra: {
            thinking: {
              type: "enabled",
              budget_tokens: 10000,
            },
          },
        }
      : {
          max_tokens: 1000,
          extra: {
            thinking: {
              type: "disabled",
            },
          },
        };
  }
  // OpenAI o1 / o3 series
  if (/\bo[13](?:-mini|-preview)?\b/i.test(id)) {
    return stream
      ? {
          max_tokens: 16000,
          extra: {
            reasoning_effort: "medium",
          },
        }
      : {
          max_tokens: 1000,
          extra: {
            reasoning_effort: "low",
          },
        };
  }
  // DeepSeek R1
  if (/deepseek-r1/i.test(id)) {
    return {
      max_tokens: stream ? 16000 : 1000,
      extra: {},
    };
  }
  // xAI Grok reasoning variants
  if (/grok.*reasoning/i.test(id)) {
    return {
      max_tokens: stream ? 16000 : 1000,
      extra: {},
    };
  }
  return null;
}
function shouldUseFallback(error) {
  const msg = String(error?.message || "");
  if (/not configured|API key is missing/i.test(msg)) return false;
  return /Provider\s*(404|429|500|502|503)|timed out|no endpoints|not.*model|model.*(unavailable|not found|does not exist)/i.test(
    msg,
  );
}

// ── Session helper ────────────────────────────────────────
async function saveToSession(env, sessionId, entry) {
  if (!env.SESSIONS) return;
  const key = `session:${sessionId}`;
  const existing = await env.SESSIONS.get(key);
  const session = existing
    ? JSON.parse(existing)
    : {
        messages: [],
      };
  session.messages.push(entry);
  await env.SESSIONS.put(key, JSON.stringify(session), {
    expirationTtl: 86400,
  });
}

// ── Request guard / validation ────────────────────────────
async function guardRequest(request, env) {
  if (!isAllowedOrigin(request, env))
    return error("Origin is not allowed", 403, request, env);
  if (
    !flag(env.MOCK_MODE) &&
    !flag(env.ALLOW_ANONYMOUS) &&
    !new URL(request.url).pathname.startsWith("/api/auth/")
  ) {
    const user = await getBearerUser(request, env);
    if (!user)
      return error(
        "Authentication required. This instance does not allow anonymous model calls.",
        401,
        request,
        env,
      );
  }
  return rateLimit(request, env);
}
function getAllowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([env.SITE_URL || DEFAULT_SITE_URL, ...configured]);
}
function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(
    origin || "",
  );
}
function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const own = new URL(request.url).origin;
  return (
    origin === own ||
    getAllowedOrigins(env).has(origin) ||
    (isLocalOrigin(own) && isLocalOrigin(origin))
  );
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigin =
    origin && isAllowedOrigin(request, env)
      ? origin
      : env.SITE_URL || DEFAULT_SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
async function rateLimit(request, env) {
  if (!env.SESSIONS) return null;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const bucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
  const key = `rate:${ip}:${bucket}`;
  const current = Number((await env.SESSIONS.get(key)) || "0");
  if (current >= RATE_LIMIT_MAX_REQUESTS) {
    return error(
      "Rate limit exceeded. Please wait and retry.",
      429,
      request,
      env,
    );
  }
  await env.SESSIONS.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS + 10,
  });
  return null;
}
function validateTopicAndModels(topic, models, personas) {
  return (
    validateText(topic, "Topic", MAX_TOPIC_CHARS) ||
    validateModels(models, personas)
  );
}
function validateModels(models, personas) {
  if (!Array.isArray(models) || !models.length)
    return "Select at least one model";
  if (models.length > MAX_MODELS)
    return `Select no more than ${MAX_MODELS} models`;
  const unknown = models.find((model) => !personas[model]);
  if (unknown) return `Unknown model id: ${unknown}`;
  return null;
}
function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 80)
    return "Provide 1 to 80 chat messages";
  if (
    messages.some(
      (m) =>
        !m ||
        !["user", "assistant", "system"].includes(m.role) ||
        typeof m.content !== "string" ||
        !m.content.trim(),
    )
  )
    return "Every message must include a valid role and content";
  if (messages.some((m) => m.content.length > MAX_MESSAGE_CHARS))
    return "Message is too long. Limit is " + MAX_MESSAGE_CHARS + " characters";
  if (
    messages.reduce((sum, m) => sum + m.content.length, 0) > MAX_CONTEXT_CHARS
  )
    return "Conversation is too long";
  return null;
}
function validateContext(context) {
  return validateText(context, "Context", MAX_CONTEXT_CHARS);
}
function normalizeVoteOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => String(option || "").trim())
    .filter(Boolean)
    .filter(
      (option, index, list) =>
        list.findIndex((x) => x.toLowerCase() === option.toLowerCase()) ===
        index,
    )
    .slice(0, 6);
}
function normalizeVoteLanguage(language) {
  return String(language || "")
    .toLowerCase()
    .startsWith("zh")
    ? "zh"
    : "en";
}
function parseVoteReply(reply) {
  const text = String(reply || "").trim();
  if (!text)
    return {
      vote: "",
      reason: "",
    };
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || "";
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      return {
        vote: parsed?.vote || parsed?.finalVote || "",
        reason: parsed?.reason || parsed?.rationale || "",
      };
    } catch {
      // Fall through to legacy text parsing.
    }
  }
  const jsonVote = text.match(
    /["']?(?:vote|finalVote|answer)["']?\s*:\s*["']?([^"',}\n\r]+)/i,
  );
  const jsonReason = text.match(
    /["']?(?:reason|rationale)["']?\s*:\s*["']?([\s\S]*)/i,
  );
  if (jsonVote || jsonReason) {
    return {
      vote: jsonVote?.[1]?.trim() || "",
      reason: jsonReason?.[1]?.replace(/[}"']+\s*$/g, "").trim() || text,
    };
  }
  const vm = text.match(/VOTE:\s*([^\n\r]+)/i);
  const rm = text.match(/REASON:\s*([\s\S]+)/i);
  return {
    vote: vm?.[1]?.trim() || "",
    reason: rm?.[1]?.trim() || text,
  };
}
function shouldRetryVoteReply(reply, parsed) {
  const text = String(reply || "").trim();
  if (!text) return false;
  const looksJsonLike =
    text.includes("{") ||
    /["']?(?:vote|finalVote|answer|reason|rationale)["']?\s*:/i.test(text);
  if (!looksJsonLike) return false;
  if (!parsed?.vote && !parsed?.reason) return false;
  if (!hasBalancedBraces(text)) return true;
  return isLikelyIncompleteSentence(parsed.reason);
}
function hasBalancedBraces(text) {
  const value = String(text || "");
  let depth = 0;
  for (const char of value) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}
function isLikelyIncompleteSentence(reason) {
  const text = String(reason || "").trim();
  if (!text || text.length > 240) return false;
  return !/[.!?\u3002\uff01\uff1f\u2026)"'\]\u201d\u2019\u300d\u300f\uff09\u3011]$/.test(
    text,
  );
}
function sanitizeVoteReason(reason, language) {
  const cleaned = String(reason || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*REASON:\s*/i, "")
    .replace(/^\s*VOTE:\s*[^\n\r]+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // If the "reason" is raw/truncated JSON, discard it — the model's output was cut off
  if (/^\{["']?(?:vote|finalVote|answer|reason)/i.test(cleaned)) {
    return language === "zh"
      ? "模型没有给出有效理由。"
      : "The model did not provide a valid reason.";
  }
  if (cleaned && cleaned !== "[no response]") return cleaned.slice(0, 500);
  return language === "zh"
    ? "模型没有给出有效理由。"
    : "The model did not provide a valid reason.";
}
function matchVoteOption(rawVote, options) {
  const raw = String(rawVote || "").trim();
  if (!options.length) {
    const binary = raw.match(/YES|NO/i)?.[0];
    return binary ? binary.toUpperCase() : "";
  }
  const cleaned = raw.replace(/^["']|["']$/g, "");
  const normalized = cleaned.toLowerCase();
  const labeledMatch = cleaned.match(
    /^(?:option\s*)?([A-F])(?:\b|[\s:：.)\]-])/i,
  );
  if (labeledMatch) {
    const index = labeledMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return options[index];
  }
  const bracketedMatch = cleaned.match(/[[({（【]\s*([A-F])\s*[:：.)\]}）】]/i);
  if (bracketedMatch) {
    const index = bracketedMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return options[index];
  }
  const canonicalMap = [
    ["YES", /^(yes|y|support|agree|approve|for|in favor|赞成|支持|同意|是)$/i],
    ["NO", /^(no|n|against|oppose|reject|disagree|反对|不同意|否)$/i],
  ];
  for (const [canonical, pattern] of canonicalMap) {
    if (
      options.some((option) => String(option).toUpperCase() === canonical) &&
      pattern.test(cleaned)
    ) {
      return canonical;
    }
  }
  return (
    options.find((option) => option.toLowerCase() === cleaned.toLowerCase()) ||
    options.find((option) => normalized.includes(option.toLowerCase())) ||
    ""
  );
}
function validateText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) return `${label} is required`;
  if (value.length > maxLength)
    return `${label} is too long. Limit is ${maxLength} characters`;
  return null;
}

// ── Helpers ───────────────────────────────────────────────
function json(data, status = 200, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json",
    },
  });
}
function error(msg, status = 500, request, env) {
  return json(
    {
      error: msg,
    },
    status,
    request,
    env,
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Platform backend: storage layer, auth + RBAC, providers, models
// Storage uses D1 (env.DB, table kv(k,v)) when bound, else falls back to KV.
// ════════════════════════════════════════════════════════════════════════════
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100000;

// ── Doc store (D1-or-KV) ─────────────────────────────────
async function sget(env, k) {
  if (env.DB) {
    const row = await env.DB.prepare("SELECT v FROM kv WHERE k = ?")
      .bind(k)
      .first();
    if (!row) return null;
    const item = JSON.parse(row.v);
    if (item && item.__expiresAt && item.__expiresAt < Date.now()) return null;
    return item && Object.prototype.hasOwnProperty.call(item, "__storedValue")
      ? item.__storedValue
      : item;
  }
  if (!env.SESSIONS) return null;
  const raw = await env.SESSIONS.get(k);
  return raw ? JSON.parse(raw) : null;
}
async function sput(env, k, v, ttlSeconds) {
  if (env.DB) {
    const stored = ttlSeconds
      ? {
          __storedValue: v,
          __expiresAt: Date.now() + ttlSeconds * 1000,
        }
      : v;
    await env.DB.prepare(
      "INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
    )
      .bind(k, JSON.stringify(stored))
      .run();
    return;
  }
  if (!env.SESSIONS)
    throw new Error(
      "Persistent storage is not configured. Bind SESSIONS KV or DB.",
    );
  await env.SESSIONS.put(
    k,
    JSON.stringify(v),
    ttlSeconds
      ? {
          expirationTtl: ttlSeconds,
        }
      : undefined,
  );
}
async function sdel(env, k) {
  if (env.DB) {
    await env.DB.prepare("DELETE FROM kv WHERE k = ?").bind(k).run();
    return;
  }
  await env.SESSIONS.delete(k);
}
async function slist(env, prefix) {
  if (env.DB) {
    const result = await env.DB.prepare("SELECT v FROM kv WHERE k LIKE ?")
      .bind(prefix + "%")
      .all();
    return (result.results || [])
      .map((row) => JSON.parse(row.v))
      .filter((item) => !item?.__expiresAt || item.__expiresAt > Date.now())
      .map((item) =>
        item && Object.prototype.hasOwnProperty.call(item, "__storedValue")
          ? item.__storedValue
          : item,
      );
  }
  if (!env.SESSIONS) return [];
  const out = [];
  let cursor;
  do {
    const page = await env.SESSIONS.list({
      prefix,
      cursor,
    });
    for (const key of page.keys) {
      const value = await env.SESSIONS.get(key.name);
      if (value) out.push(JSON.parse(value));
    }
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return out;
}

// ── crypto helpers ───────────────────────────────────────
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function randomHex(n) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(n)));
}
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return {
    salt: bytesToHex(salt),
    hash: bytesToHex(new Uint8Array(bits)),
  };
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── user/session helpers ─────────────────────────────────
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    credits: u.credits,
    startingCredits: u.startingCredits,
    createdAt: u.createdAt,
  };
}
function isAdminEmail(env, email) {
  return String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
async function getBearerUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const sess = await sget(env, `sess:${m[1]}`);
  if (!sess || (sess.exp && sess.exp < Date.now())) return null;
  const user = await sget(env, "user:" + sess.userId);
  return user?.status === "banned" ? null : user;
}
async function requireAdmin(request, env) {
  const u = await getBearerUser(request, env);
  if (!u)
    return {
      resp: error("Authentication required", 401, request, env),
    };
  if (u.role !== "admin")
    return {
      resp: error("Admin privileges required", 403, request, env),
    };
  return {
    user: u,
  };
}

// ── provider/model output masking ────────────────────────
function maskKey(k) {
  return k ? `••••${String(k).slice(-4)}` : "";
}
function publicProvider(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    baseUrl: p.baseUrl,
    enabled: p.enabled !== false,
    priority: p.priority || 0,
    timeoutMs: p.timeoutMs || 45000,
    hasKey: !!p.apiKey,
    keyMask: maskKey(p.apiKey),
    createdAt: p.createdAt,
  };
}
const MODEL_BRANDS = [
  {
    re: /^anthropic\b|^claude\b/i,
    company: "Anthropic",
    symbol: "AI",
    domain: "anthropic.com",
  },
  {
    re: /^openai\b|^gpt\b|^o[134]\b/i,
    company: "OpenAI",
    symbol: "OA",
    domain: "openai.com",
  },
  {
    re: /^google\b|^gemini\b|^gemma\b/i,
    company: "Google",
    symbol: "G",
    domain: "google.com",
  },
  {
    re: /^x-ai\b|^xai\b|^grok\b/i,
    company: "xAI",
    symbol: "X",
    domain: "x.ai",
  },
  {
    re: /^deepseek\b/i,
    company: "DeepSeek",
    symbol: "DS",
    domain: "deepseek.com",
  },
  {
    re: /^moonshotai\b|^moonshot\b|^kimi\b/i,
    company: "Moonshot AI",
    symbol: "KM",
    domain: "moonshot.ai",
  },
  {
    re: /^perplexity\b/i,
    company: "Perplexity",
    symbol: "PX",
    domain: "perplexity.ai",
  },
  {
    re: /^sonar\b/i,
    company: "Perplexity",
    symbol: "PX",
    domain: "perplexity.ai",
  },
  {
    re: /^qwen\b|^alibaba\b/i,
    company: "Qwen",
    symbol: "Q",
    domain: "qwen.ai",
  },
  {
    re: /^z-ai\b|^zhipu\b|^glm\b/i,
    company: "Zhipu AI",
    symbol: "Z",
    domain: "z.ai",
  },
  {
    re: /^mistralai\b|^mistral\b/i,
    company: "Mistral",
    symbol: "M",
    domain: "mistral.ai",
  },
  {
    re: /^meta-llama\b|^meta\b|^llama\b/i,
    company: "Meta",
    symbol: "M",
    domain: "meta.com",
  },
  {
    re: /^minimax\b/i,
    company: "MiniMax",
    symbol: "MM",
    domain: "minimax.io",
  },
  {
    re: /^cohere\b/i,
    company: "Cohere",
    symbol: "C",
    domain: "cohere.com",
  },
  {
    re: /^nvidia\b|^nemotron\b/i,
    company: "NVIDIA",
    symbol: "N",
    domain: "nvidia.com",
  },
  {
    re: /^amazon\b|^nova\b/i,
    company: "Amazon",
    symbol: "A",
    domain: "amazon.com",
  },
  {
    re: /^microsoft\b|^phi\b/i,
    company: "Microsoft",
    symbol: "MS",
    domain: "microsoft.com",
  },
  {
    re: /^bytedance-seed\b|^bytedance\b|^seed\b/i,
    company: "ByteDance Seed",
    symbol: "BD",
    domain: "seed.bytedance.com",
  },
  {
    re: /^baidu\b|^ernie\b/i,
    company: "Baidu",
    symbol: "B",
    domain: "baidu.com",
  },
  {
    re: /^tencent\b|^hunyuan\b/i,
    company: "Tencent",
    symbol: "T",
    domain: "tencent.com",
  },
  {
    re: /^nousresearch\b|^nous\b|^hermes\b/i,
    company: "Nous Research",
    symbol: "NR",
    domain: "nousresearch.com",
  },
  {
    re: /^arcee-ai\b|^arcee\b|^trinity\b/i,
    company: "Arcee AI",
    symbol: "A",
    domain: "arcee.ai",
  },
  {
    re: /^prime-intellect\b|^intellect\b/i,
    company: "Prime Intellect",
    symbol: "PI",
    domain: "primeintellect.ai",
  },
  {
    re: /^opper\b|^talkie\b/i,
    company: "Talkie",
    symbol: "T",
    domain: "talkie.ai",
  },
];
function logoForDomain(domain) {
  const localLogos = {
    "anthropic.com": "/model-logos/anthropic.svg",
    "openai.com": "/model-logos/openai.svg",
    "google.com": "/model-logos/google.svg",
    "x.ai": "/model-logos/xai.svg",
    "deepseek.com": "/model-logos/deepseek.webp",
    "moonshot.ai": "/model-logos/moonshot.svg",
    "perplexity.ai": "/model-logos/perplexity.svg",
    "qwen.ai": "/model-logos/qwen.webp",
    "z.ai": "/model-logos/zai.svg",
    "mistral.ai": "/model-logos/mistral.png",
    "meta.com": "/model-logos/meta.svg",
    "minimax.io": "/model-logos/minimax.webp",
    "cohere.com": "",
    "nvidia.com": "/model-logos/nemotron.svg",
    "amazon.com": "/model-logos/aws.svg",
    "microsoft.com": "/model-logos/phi.webp",
    "seed.bytedance.com": "",
    "baidu.com": "",
    "tencent.com": "",
    "nousresearch.com": "/model-logos/hermes.png",
    "arcee.ai": "/model-logos/arcee.webp",
    "primeintellect.ai": "/model-logos/intellect.svg",
    "talkie.ai": "/model-logos/talkie.webp",
  };
  return localLogos[domain] || "";
}
function brandFromModel(upstreamId, rawName) {
  const source = String(upstreamId || rawName || "")
    .replace(/^~/, "")
    .split(/[/:]/)[0]
    .trim();
  const text = `${source} ${rawName || ""}`.trim();
  const brand = MODEL_BRANDS.find((b) => b.re.test(source) || b.re.test(text));
  if (brand)
    return {
      company: brand.company,
      symbol: brand.symbol,
      logoUrl: logoForDomain(brand.domain),
    };
  const company =
    source
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 40) || "AI";
  return {
    company,
    symbol:
      company
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 2)
        .toUpperCase() || "AI",
    logoUrl: "",
  };
}
function titleizeModelId(id) {
  return String(id || "")
    .replace(/^~/, "")
    .split("/")
    .pop()
    .replace(/:free$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(gpt|glm|qwen|ai|vl|r1|v\d+|k\d+|o\d+)\b/gi, (m) =>
      m.toUpperCase(),
    )
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bGpt\b/g, "GPT")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bV(\d)/g, "V$1")
    .trim();
}
function normalizeModelDisplayName(rawName, upstreamId, company) {
  let name = String(rawName || "").trim() || titleizeModelId(upstreamId);
  name = name.replace(/\s*\(free\)\s*$/i, "");
  name = name.replace(/^([^:]{2,40}):\s*/, "");
  name = name
    .replace(/^Anthropic\s+(?=Claude\b)/i, "")
    .replace(/^Google\s+(?=(Gemini|Gemma)\b)/i, "")
    .replace(/^OpenAI\s+(?=(GPT|O[134])\b)/i, "")
    .replace(/^MoonshotAI\s+(?=Kimi\b)/i, "")
    .replace(/^DeepSeek\s+(?=DeepSeek\b)/i, "")
    .replace(/^xAI\s+(?=Grok\b)/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (company === "Perplexity" && /^Sonar\b/i.test(name))
    name = `Perplexity ${name}`;
  return (name || titleizeModelId(upstreamId)).slice(0, 80);
}

// ── generic OpenAI-compatible provider caller ────────────
function personaTemp(system, dflt) {
  const s = String(system || "");
  if (/直球|Blunt/.test(s)) return 0.95;
  if (/急性子|Closer/.test(s)) return 0.9;
  if (/故事|Storyteller/.test(s)) return 0.85;
  if (/拉远镜头|Zoom-out/.test(s)) return 0.8;
  if (/草根|Grassroots|怀疑|Skeptic/.test(s)) return 0.6;
  if (/较真|Stickler/.test(s)) return 0.55;
  if (/冷静分析|Calm analyst/.test(s)) return 0.5;
  if (/性格只决定|persona shapes only/.test(s)) return 0.75;
  return dflt;
}
async function callProvider(provider, upstreamModel, system, messages) {
  if (!provider || !provider.baseUrl)
    throw new Error("Provider is not configured");
  if (!provider.apiKey) throw new Error("Provider API key is missing");
  const base = provider.baseUrl.replace(/\/+$/, "");
  const endpoint = /\/chat\/completions$/.test(base)
    ? base
    : `${base}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    provider.timeoutMs || 45000,
  );
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: upstreamModel,
        messages: [
          ...(system
            ? [
                {
                  role: "system",
                  content: system,
                },
              ]
            : []),
          ...messages,
        ],
        ...(() => {
          const tp = getThinkingParams(upstreamModel, false);
          const __dbg = (() => {
            try {
              return /【最高优先级】|你自己上一轮/.test(
                JSON.stringify(messages),
              );
            } catch (e) {
              return false;
            }
          })();
          return {
            max_tokens: tp ? tp.max_tokens : 1400,
            temperature: personaTemp(system, 0.65),
            ...(__dbg
              ? {
                  frequency_penalty: 0.4,
                  presence_penalty: 0.3,
                }
              : {}),
            ...(tp?.extra || {}),
          };
        })(),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error("Provider request timed out", {
        cause: e,
      });
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Provider ${res.status}: request failed`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "[no response]";
}
async function listEnabledRegistryModels(env) {
  if (!env.DB && !env.SESSIONS) return [];
  return (await slist(env, "model:")).filter((m) => m && m.enabled !== false);
}
function publicRegistryModel(m) {
  return {
    id: m.id,
    displayName: m.displayName,
    providerId: m.providerId,
    providerName: m.providerName || m.company || "",
    company: m.company || m.providerName || "",
    symbol: m.symbol || "",
    logoUrl: m.logoUrl || "",
    tags: m.tags || [],
    contextLen: m.contextLen || 0,
    source: "registry",
  };
}
async function listPublicModels(env) {
  const defaults = publicConfiguredModels(env);
  if (flag(env.MOCK_MODE)) return defaults;
  const registry = await listEnabledRegistryModels(env);
  const providers = await slist(env, "provider:");
  const allowed = new Set(
    providers.filter((p) => p.enabled !== false).map((p) => p.id),
  );
  return [
    ...defaults,
    ...registry
      .filter((m) => allowed.has(m.providerId))
      .map(publicRegistryModel),
  ].filter((m, i, all) => all.findIndex((other) => other.id === m.id) === i);
}
const PREFERRED_PUBLIC_MODELS = [
  "anthropic/claude-opus-4.8",
  "google/gemini-3.5-flash",
  "openai/gpt-5.5",
  "x-ai/grok-4.3",
  "moonshotai/kimi-k2.6",
  "perplexity/sonar-pro",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-4.7",
  "anthropic/claude-opus-4.6",
  "anthropic/claude-opus-4.5",
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-sonnet-4.5",
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-v3.2",
  "google/gemini-3.1-flash-lite-preview",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemma-4-26b-a4b-it",
  "qwen/qwen3.6-plus",
  "qwen/qwen3.5-397b",
  "z-ai/glm-5.1",
  "z-ai/glm-5",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.3-chat",
  "openai/gpt-5.2",
  "openai/gpt-5.1",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-4o",
  "openai/gpt-3.5-turbo",
  "x-ai/grok-4.20-non-reasoning",
  "x-ai/grok-4.20-reasoning",
  "x-ai/grok-4",
];
function sortPublicModels(models) {
  const rank = new Map(PREFERRED_PUBLIC_MODELS.map((id, index) => [id, index]));
  return [...models].sort((a, b) => {
    const ar = rank.has(a.upstreamModel) ? rank.get(a.upstreamModel) : 10000;
    const br = rank.has(b.upstreamModel) ? rank.get(b.upstreamModel) : 10000;
    if (ar !== br) return ar - br;
    const alatest = String(a.upstreamModel || "").startsWith("~") ? 1 : 0;
    const blatest = String(b.upstreamModel || "").startsWith("~") ? 1 : 0;
    if (alatest !== blatest) return alatest - blatest;
    return String(a.displayName || "").localeCompare(
      String(b.displayName || ""),
    );
  });
}
function registrySystemPrompt(model) {
  const tags =
    Array.isArray(model.tags) && model.tags.length
      ? ` Focus areas: ${model.tags.join(", ")}.`
      : "";
  return `You are ${model.displayName}, participating as one panelist in an AI roundtable.${tags} Be concise, specific, and willing to disagree when the evidence supports it. Keep responses to 3-4 sentences unless asked otherwise.`;
}
async function getRuntimeCatalog(env) {
  if (flag(env.MOCK_MODE)) return configuredCatalog(env);
  const catalog = {};

  // 1. Load all models + providers in two parallel slist calls (avoids N serial sget)
  const [allModels, allProviders] = await Promise.all([
    slist(env, "model:"),
    slist(env, "provider:"),
  ]);
  const providerMap = new Map(allProviders.map((p) => [p.id, p]));

  // 3. Group enabled models by upstreamModel, sorted by provider priority desc
  //    This is the core of priority-based routing: same upstream → multiple providers
  const upstreamMap = new Map(); // upstreamModel → [{model, provider}, ...]
  for (const model of allModels) {
    if (model.enabled === false) continue;
    const provider = providerMap.get(model.providerId);
    if (!provider || provider.enabled === false) continue;
    const key = model.upstreamModel;
    if (!upstreamMap.has(key)) upstreamMap.set(key, []);
    upstreamMap.get(key).push({
      model,
      provider,
    });
  }
  for (const entries of upstreamMap.values()) {
    entries.sort(
      (a, b) => (b.provider.priority || 0) - (a.provider.priority || 0),
    );
  }

  // 4. Build catalog entries — each entry carries the full providerChain for its upstreamModel
  for (const model of allModels) {
    if (model.enabled === false) continue;
    const provider = providerMap.get(model.providerId);
    if (!provider || provider.enabled === false) continue;
    const providerChain = upstreamMap.get(model.upstreamModel) || [
      {
        model,
        provider,
      },
    ];
    catalog[model.id] = {
      source: "registry",
      id: model.id,
      name: model.displayName,
      system: registrySystemPrompt(model),
      model,
      provider,
      providerChain, // sorted by priority; callRegistryModel will walk this chain
    };
  }
  return Object.assign(configuredCatalog(env), catalog);
}
async function getSummaryRuntime(env) {
  const catalog = await getRuntimeCatalog(env);
  const registryEntries = Object.values(catalog).filter(
    (m) => m.source === "registry",
  );
  const summaryModel =
    registryEntries.find((m) =>
      (m.model.tags || []).some((tag) =>
        /summary|synthesis|reasoning/i.test(tag),
      ),
    ) || registryEntries[0];
  if (summaryModel) return summaryModel;
  return null;
}
async function callRuntimeModel(env, runtime, system, messages) {
  if (!runtime)
    throw new Error(
      "No callable model configured. Set OPENROUTER_API_KEY and ROUND_TABLE_MODELS.",
    );
  if (runtime.source === "mock")
    return {
      reply: mockReply(runtime.id, [
        { role: "system", content: system || runtime.system || "" },
        ...messages,
      ]),
      modelUsed: runtime.id,
      fallbackUsed: false,
    };
  return callRegistryModel(env, runtime, system || runtime.system, messages);
}
function sseHeaders(request, env) {
  return {
    ...corsHeaders(request, env),
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}
function sseWrite(controller, encoder, event, data) {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  );
}
function streamRuntimeModel(env, runtime, system, messages, request) {
  const encoder = new TextEncoder(),
    abort = new AbortController();
  const cancel = () => abort.abort();
  request.signal?.addEventListener("abort", cancel, {
    once: true,
  });
  if (request.signal?.aborted) abort.abort();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (runtime.source === "mock") {
          const reply = mockReply(runtime.id, messages);
          sseWrite(controller, encoder, "meta", {
            modelUsed: runtime.id,
            fallbackUsed: false,
          });
          const chunks = reply.match(/.{1,18}/gs) || [];
          for (const token of chunks) {
            if (abort.signal.aborted) return;
            await new Promise((resolve) => setTimeout(resolve, 10));
            if (abort.signal.aborted) return;
            sseWrite(controller, encoder, "token", {
              token,
            });
          }
          if (!abort.signal.aborted)
            sseWrite(controller, encoder, "done", {
              reply,
              modelUsed: runtime.id,
              fallbackUsed: false,
            });
        } else
          await streamRegistryModel(
            env,
            runtime,
            system,
            messages,
            controller,
            encoder,
            abort.signal,
          );
      } catch (e) {
        if (!abort.signal.aborted)
          sseWrite(controller, encoder, "error", {
            error: e.name === "AbortError" ? "Request stopped" : e.message,
          });
      } finally {
        request.signal?.removeEventListener("abort", cancel);
        if (!abort.signal.aborted) controller.close();
      }
    },
    cancel,
  });
  return new Response(stream, {
    headers: sseHeaders(request, env),
  });
}
async function streamRegistryModel(
  env,
  runtime,
  system,
  messages,
  controller,
  encoder,
  requestSignal,
) {
  const chain = runtime.providerChain || [
    {
      model: runtime.model,
      provider: runtime.provider,
    },
  ];
  let lastError;
  for (let i = 0; i < chain.length; i++) {
    const { model, provider } = chain[i];
    try {
      return await streamProvider(
        provider,
        model.upstreamModel,
        system,
        messages,
        controller,
        encoder,
        i > 0,
        requestSignal,
      );
    } catch (e) {
      lastError = e;
      if (!shouldUseFallback(e)) throw e;
    }
  }
  throw lastError;
}
async function streamProvider(
  provider,
  upstreamModel,
  system,
  messages,
  controller,
  encoder,
  fallbackUsed,
  requestSignal,
) {
  if (!provider || !provider.baseUrl)
    throw new Error("Provider is not configured");
  if (!provider.apiKey) throw new Error("Provider API key is missing");
  const base = provider.baseUrl.replace(/\/+$/, "");
  const endpoint = /\/chat\/completions$/.test(base)
    ? base
    : `${base}/chat/completions`;
  return streamOpenAICompatible({
    endpoint,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    model: upstreamModel,
    system,
    messages,
    timeoutMs: provider.timeoutMs || 45000,
    modelUsed: upstreamModel,
    fallbackUsed,
    controller,
    encoder,
    requestSignal,
  });
}
async function streamOpenAICompatible({
  endpoint,
  headers,
  model,
  system,
  messages,
  timeoutMs,
  modelUsed,
  fallbackUsed,
  controller,
  encoder,
  requestSignal,
}) {
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && typeof m.content === "string" && m.content.trim())
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }))
    : [];
  if (!safeMessages.length) throw new Error("No valid chat messages");
  const abort = new AbortController();
  if (requestSignal?.aborted) abort.abort();
  else
    requestSignal?.addEventListener("abort", () => abort.abort(), {
      once: true,
    });
  const timeoutId = setTimeout(() => abort.abort(), timeoutMs || 45000);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          ...(system
            ? [
                {
                  role: "system",
                  content: system,
                },
              ]
            : []),
          ...safeMessages,
        ],
        ...(() => {
          const tp = getThinkingParams(modelUsed, true);
          const __dbg = (() => {
            try {
              return /【最高优先级】|你自己上一轮/.test(
                JSON.stringify(safeMessages),
              );
            } catch (e) {
              return false;
            }
          })();
          return {
            max_tokens: tp ? tp.max_tokens : 1400,
            temperature: personaTemp(system, 0.65),
            ...(__dbg
              ? {
                  frequency_penalty: 0.4,
                  presence_penalty: 0.3,
                }
              : {}),
            ...(tp?.extra || {}),
            stream: true,
          };
        })(),
      }),
      signal: abort.signal,
    });
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error("Provider request timed out", {
        cause: e,
      });
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Provider ${res.status}: request failed`);
  }
  sseWrite(controller, encoder, "meta", {
    modelUsed,
    fallbackUsed,
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  const consumePart = (part) => {
    const lines = part.split("\n").filter((line) => line.startsWith("data:"));
    for (const line of lines) {
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content || "";
        if (token) {
          reply += token;
          sseWrite(controller, encoder, "token", {
            token,
          });
        }
      } catch {
        /* ignore malformed upstream stream chunks */
      }
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {
      stream: true,
    });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      consumePart(part);
    }
  }
  if (buffer.trim()) consumePart(buffer);
  return {
    reply,
    modelUsed,
    fallbackUsed,
  };
}
async function callRegistryModel(env, runtime, system, messages) {
  // Walk the providerChain (sorted by priority) — try each provider in order
  const chain = runtime.providerChain || [
    {
      model: runtime.model,
      provider: runtime.provider,
    },
  ];
  let lastError;
  for (let i = 0; i < chain.length; i++) {
    const { model, provider } = chain[i];
    try {
      const reply = await callProvider(
        provider,
        model.upstreamModel,
        system,
        messages,
      );
      return {
        reply,
        modelUsed: model.upstreamModel,
        fallbackUsed: i > 0,
      };
    } catch (e) {
      lastError = e;
      if (!shouldUseFallback(e)) throw e; // config/auth errors: don't retry
      // else: try next provider in chain
    }
  }
  throw lastError;
}

// ════════════════════════════════════════════════════════
// Route dispatcher for auth + admin + public models
// Returns a Response if it handles the path, else null.
// ════════════════════════════════════════════════════════
async function routeAuthAndAdmin(url, request, env) {
  const p = url.pathname;
  const method = request.method;

  // ── Auth ──
  if (p === "/api/wallet/usage" && method === "POST")
    return error(
      "Usage is recorded by the server; client-submitted charges are disabled.",
      405,
      request,
      env,
    );
  if (p === "/api/wallet/add-demo" && method === "POST" && !flag(env.MOCK_MODE))
    return error(
      "Demo credits are only available in mock mode.",
      403,
      request,
      env,
    );
  if (p === "/api/auth/profile" && method === "POST")
    return handleProfile(request, env);
  if (p === "/api/auth/change-password" && method === "POST")
    return handlePasswordChange(request, env);
  if (p === "/api/auth/signup" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    return handleSignup(request, env);
  }
  if (p === "/api/auth/login" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    return handleLogin(request, env);
  }
  if (p === "/api/auth/logout" && method === "POST") {
    return handleLogout(request, env);
  }
  if (p === "/api/auth/request-password-reset" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    return handleRequestPasswordReset(request, env);
  }
  if (p === "/api/auth/reset-password" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    return handleResetPassword(request, env);
  }
  if (p === "/api/auth/verify-email" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    return handleVerifyEmail(request, env);
  }
  if (p === "/api/auth/me" && method === "GET") {
    const u = await getBearerUser(request, env);
    return json(
      {
        user: publicUser(u),
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/wallet" && method === "GET") {
    const u = await getBearerUser(request, env);
    if (!u) return error("Authentication required", 401, request, env);
    const usage = (await slist(env, `usage:${u.id}:`)).sort(
      (x, y) => (y.at || 0) - (x.at || 0),
    );
    return json(
      {
        wallet: {
          balance: u.credits || 0,
          starting: u.startingCredits || 0,
          used: Math.max(0, (u.startingCredits || 0) - (u.credits || 0)),
        },
        usage,
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/wallet/usage" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    const u = await getBearerUser(request, env);
    if (!u) return error("Authentication required", 401, request, env);
    const { label, modelCount, amount } = await request.json();
    const cost = Math.max(0, Number(amount) || 0);
    if ((u.credits || 0) < cost)
      return error("Insufficient credits", 402, request, env);
    u.credits = Math.max(0, Number(((u.credits || 0) - cost).toFixed(4)));
    await sput(env, `user:${u.id}`, u);
    const event = {
      id: `usage_${Date.now()}_${randomHex(3)}`,
      label: String(label || "usage").slice(0, 80),
      modelCount: Number(modelCount) || 0,
      amount: cost,
      at: Date.now(),
      userId: u.id,
    };
    await sput(env, `usage:${u.id}:${event.id}`, event);
    return json(
      {
        user: publicUser(u),
        wallet: {
          balance: u.credits,
          starting: u.startingCredits || 0,
          used: Math.max(0, (u.startingCredits || 0) - (u.credits || 0)),
        },
        event,
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/wallet/add-demo" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    const u = await getBearerUser(request, env);
    if (!u) return error("Authentication required", 401, request, env);
    u.credits = Number(((u.credits || 0) + 5).toFixed(4));
    u.startingCredits = Number(((u.startingCredits || 0) + 5).toFixed(4));
    await sput(env, `user:${u.id}`, u);
    return json(
      {
        user: publicUser(u),
        wallet: {
          balance: u.credits,
          starting: u.startingCredits,
          used: Math.max(0, (u.startingCredits || 0) - (u.credits || 0)),
        },
      },
      200,
      request,
      env,
    );
  }

  // ── Public models catalog (enabled only) ──
  if (p === "/api/models" && method === "GET") {
    const r = json(
      {
        models: await listPublicModels(env),
      },
      200,
      request,
      env,
    );
    r.headers.set("Cache-Control", "no-store");
    return r;
  }

  // ── Admin: providers ──
  if (p === "/api/admin/providers" && method === "GET") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    const list = await slist(env, "provider:");
    return json(
      {
        providers: list
          .sort((x, y) => (y.priority || 0) - (x.priority || 0))
          .map(publicProvider),
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/admin/providers" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    return handleUpsertProvider(request, env);
  }
  if (p === "/api/admin/providers/delete" && method === "POST") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    const { id } = await request.json();
    if (id) await sdel(env, `provider:${id}`);
    return json(
      {
        ok: true,
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/admin/providers/test" && method === "POST") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    return handleTestProvider(request, env);
  }
  if (p === "/api/admin/providers/sync-models" && method === "POST") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    return handleSyncProviderModels(request, env);
  }

  // ── Admin: models ──
  if (p === "/api/admin/models" && method === "GET") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    return json(
      {
        models: await slist(env, "model:"),
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/admin/models" && method === "POST") {
    const gate = await guardRequest(request, env);
    if (gate) return gate;
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    return handleUpsertModel(request, env);
  }
  if (p === "/api/admin/models/delete" && method === "POST") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    const { id } = await request.json();
    if (id) await sdel(env, `model:${id}`);
    return json(
      {
        ok: true,
      },
      200,
      request,
      env,
    );
  }

  // ── Admin: users ──
  if (p === "/api/admin/users" && method === "GET") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    const users = (await slist(env, "user:"))
      .map(publicUser)
      .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
    return json(
      {
        users,
      },
      200,
      request,
      env,
    );
  }
  if (p === "/api/admin/users/update" && method === "POST") {
    const a = await requireAdmin(request, env);
    if (a.resp) return a.resp;
    return handleAdminUpdateUser(request, env);
  }
  return null;
}

// ── Auth handlers ────────────────────────────────────────
async function handleSignup(request, env) {
  if (!flag(env.ENABLE_REGISTRATION))
    return error(
      "Registration is disabled on this instance.",
      403,
      request,
      env,
    );
  try {
    const { email, password, name } = await request.json();
    const e = String(email || "")
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
      return error("Enter a valid email", 400, request, env);
    if (typeof password !== "string" || password.length < 8)
      return error("Password must be at least 8 characters", 400, request, env);
    const existingId = await sget(env, `useremail:${e}`);
    if (existingId)
      return error(
        "An account with this email already exists",
        409,
        request,
        env,
      );
    const allUsers = await slist(env, "user:");
    const isFirst = allUsers.length === 0;
    const { salt, hash } = await hashPassword(password);
    const id = `u_${Date.now()}_${randomHex(4)}`;
    const user = {
      id,
      email: e,
      name: String(name || e.split("@")[0]).slice(0, 80),
      role: "user",
      status: "active",
      passwordSalt: salt,
      passwordHash: hash,
      credits: 5,
      startingCredits: 5,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    await sput(env, `user:${id}`, user);
    await sput(env, `useremail:${e}`, id);
    await sput(
      env,
      `emailverify:${randomHex(24)}`,
      {
        userId: id,
        email: e,
        exp: Date.now() + 24 * 60 * 60 * 1000,
      },
      24 * 60 * 60,
    );
    const token = randomHex(32);
    await sput(
      env,
      `sess:${token}`,
      {
        userId: id,
        createdAt: Date.now(),
        exp: Date.now() + SESSION_TTL_SECONDS * 1000,
      },
      SESSION_TTL_SECONDS,
    );
    return json(
      {
        token,
        user: publicUser(user),
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();
    const e = String(email || "")
      .trim()
      .toLowerCase();
    const lockKey = `loginfail:${e}`;
    const failures = Number((await sget(env, lockKey))?.count || 0);
    if (failures >= LOGIN_LOCK_MAX_FAILURES)
      return error(
        "Too many failed login attempts. Try again later.",
        429,
        request,
        env,
      );
    const id = await sget(env, `useremail:${e}`);
    const user = id ? await sget(env, `user:${id}`) : null;
    const fail = async () => {
      await sput(
        env,
        lockKey,
        {
          count: failures + 1,
          at: Date.now(),
        },
        LOGIN_LOCK_WINDOW_SECONDS,
      );
      return error("Email or password is incorrect", 401, request, env);
    };
    if (!user) return fail();
    if (user.status === "banned")
      return error("This account is suspended", 403, request, env);
    const { hash } = await hashPassword(
      String(password || ""),
      user.passwordSalt,
    );
    if (!timingSafeEqual(hash, user.passwordHash)) return fail();
    await sdel(env, lockKey);
    const token = randomHex(32);
    await sput(
      env,
      `sess:${token}`,
      {
        userId: user.id,
        createdAt: Date.now(),
        exp: Date.now() + SESSION_TTL_SECONDS * 1000,
      },
      SESSION_TTL_SECONDS,
    );
    user.lastActive = Date.now();
    await sput(env, `user:${user.id}`, user);
    return json(
      {
        token,
        user: publicUser(user),
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleRequestPasswordReset(request, env) {
  return error(
    "Password reset email is not configured. Contact the instance operator.",
    501,
    request,
    env,
  );
}
async function handleResetPassword(request, env) {
  try {
    const { token, password } = await request.json();
    const rec = await sget(env, `reset:${String(token || "")}`);
    if (!rec || rec.exp < Date.now())
      return error("Reset token is invalid or expired", 400, request, env);
    if (typeof password !== "string" || password.length < 8)
      return error("Password must be at least 8 characters", 400, request, env);
    const user = await sget(env, `user:${rec.userId}`);
    if (!user) return error("Account not found", 404, request, env);
    const { salt, hash } = await hashPassword(password);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    await sput(env, `user:${user.id}`, user);
    await sdel(env, `reset:${String(token || "")}`);
    return json(
      {
        ok: true,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleVerifyEmail(request, env) {
  try {
    const { token } = await request.json();
    const rec = await sget(env, `emailverify:${String(token || "")}`);
    if (!rec || rec.exp < Date.now())
      return error(
        "Verification token is invalid or expired",
        400,
        request,
        env,
      );
    const user = await sget(env, `user:${rec.userId}`);
    if (!user) return error("Account not found", 404, request, env);
    user.emailVerified = true;
    await sput(env, `user:${user.id}`, user);
    await sdel(env, `emailverify:${String(token || "")}`);
    return json(
      {
        user: publicUser(user),
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleLogout(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) await sdel(env, `sess:${m[1]}`);
  return json(
    {
      ok: true,
    },
    200,
    request,
    env,
  );
}

// ── Provider handlers ────────────────────────────────────
async function handleUpsertProvider(request, env) {
  try {
    const b = await request.json();
    const id = b.id || `prov_${Date.now()}_${randomHex(3)}`;
    const existing = b.id ? await sget(env, `provider:${id}`) : null;
    const provider = {
      id,
      name: String(b.name || existing?.name || "Provider").slice(0, 80),
      slug: String(b.slug || existing?.slug || id).slice(0, 40),
      baseUrl: String(b.baseUrl || existing?.baseUrl || "").slice(0, 300),
      apiKey:
        typeof b.apiKey === "string" && b.apiKey && !b.apiKey.startsWith("••••")
          ? b.apiKey
          : existing?.apiKey || "",
      enabled:
        b.enabled !== undefined ? !!b.enabled : existing?.enabled !== false,
      priority: Number.isFinite(b.priority)
        ? b.priority
        : existing?.priority || 0,
      timeoutMs: Number.isFinite(b.timeoutMs)
        ? b.timeoutMs
        : existing?.timeoutMs || 45000,
      createdAt: existing?.createdAt || Date.now(),
    };
    if (!provider.baseUrl)
      return error("Provider baseUrl is required", 400, request, env);
    await sput(env, `provider:${id}`, provider);
    return json(
      {
        provider: publicProvider(provider),
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleTestProvider(request, env) {
  try {
    const { id, model } = await request.json();
    const provider = await sget(env, `provider:${id}`);
    if (!provider) return error("Provider not found", 404, request, env);
    const upstream = model || "gpt-4o-mini";
    const t0 = Date.now();
    try {
      const reply = await callProvider(
        provider,
        upstream,
        "You are a connectivity test.",
        [
          {
            role: "user",
            content: "Reply with the single word: ok",
          },
        ],
      );
      return json(
        {
          ok: true,
          latencyMs: Date.now() - t0,
          sample: String(reply).slice(0, 120),
        },
        200,
        request,
        env,
      );
    } catch (err) {
      return json(
        {
          ok: false,
          latencyMs: Date.now() - t0,
          error: err.message,
        },
        200,
        request,
        env,
      );
    }
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── Sync provider models ─────────────────────────────────
async function handleSyncProviderModels(request, env) {
  try {
    const { id } = await request.json();
    const provider = await sget(env, `provider:${id}`);
    if (!provider) return error("Provider not found", 404, request, env);
    if (!provider.apiKey)
      return error("Provider has no API key configured", 400, request, env);
    const base = provider.baseUrl
      .replace(/\/+$/, "")
      .replace(/\/chat\/completions$/, "");
    const res = await fetch(`${base}/models`, {
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok)
      return error(
        `Provider /models returned HTTP ${res.status}`,
        502,
        request,
        env,
      );
    const data = await res.json();
    // OpenAI-compatible: { data: [...] }  |  some providers: { models: [...] }
    const list = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.models)
        ? data.models
        : [];
    const slug = (provider.slug || provider.id)
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    let synced = 0,
      skipped = 0;
    for (const m of list.slice(0, 500)) {
      const upstreamId = String(m.id || "").trim();
      if (!upstreamId) {
        skipped++;
        continue;
      }
      const safeId = upstreamId
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .slice(0, 60);
      const modelId = `${slug}_${safeId}`;
      const existing = await sget(env, `model:${modelId}`);
      const pricing = m.pricing || {};
      const brand = brandFromModel(upstreamId, m.name);
      const displayName = normalizeModelDisplayName(
        m.name,
        upstreamId,
        brand.company,
      );
      // OpenRouter pricing is per-token; convert to per-1M-tokens
      const costIn =
        Math.round(
          parseFloat(pricing.prompt || pricing.input || 0) * 1_000_000 * 1000,
        ) / 1000;
      const costOut =
        Math.round(
          parseFloat(pricing.completion || pricing.output || 0) *
            1_000_000 *
            1000,
        ) / 1000;
      await sput(env, `model:${modelId}`, {
        id: modelId,
        displayName,
        providerId: id,
        providerName: provider.name || provider.slug || id,
        company: brand.company,
        symbol: brand.symbol,
        logoUrl: brand.logoUrl,
        upstreamModel: upstreamId,
        canonicalSlug: String(m.canonical_slug || "").slice(0, 160),
        fallbackModel: existing?.fallbackModel || "",
        costIn: Number.isFinite(costIn) ? costIn : 0,
        costOut: Number.isFinite(costOut) ? costOut : 0,
        contextLen: Number.isFinite(m.context_length) ? m.context_length : 0,
        tags: existing?.tags || [],
        enabled: existing !== null ? existing.enabled : true,
        createdAt: existing?.createdAt || Date.now(),
      });
      synced++;
    }
    return json(
      {
        synced,
        skipped,
        total: list.length,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── Model handlers ───────────────────────────────────────
async function handleUpsertModel(request, env) {
  try {
    const b = await request.json();
    const id = b.id || `model_${Date.now()}_${randomHex(3)}`;
    const existing = b.id ? await sget(env, `model:${id}`) : null;
    const model = {
      id,
      displayName: String(
        b.displayName || existing?.displayName || "Model",
      ).slice(0, 80),
      providerId: String(b.providerId || existing?.providerId || ""),
      providerName: String(
        b.providerName || existing?.providerName || "",
      ).slice(0, 80),
      company: String(b.company || existing?.company || "").slice(0, 80),
      symbol: String(b.symbol || existing?.symbol || "").slice(0, 8),
      logoUrl: String(b.logoUrl || existing?.logoUrl || "").slice(0, 300),
      upstreamModel: String(
        b.upstreamModel || existing?.upstreamModel || "",
      ).slice(0, 200),
      fallbackModel: String(
        b.fallbackModel || existing?.fallbackModel || "",
      ).slice(0, 200),
      costIn: Number.isFinite(b.costIn) ? b.costIn : existing?.costIn || 0,
      costOut: Number.isFinite(b.costOut) ? b.costOut : existing?.costOut || 0,
      contextLen: Number.isFinite(b.contextLen)
        ? b.contextLen
        : existing?.contextLen || 0,
      tags: Array.isArray(b.tags)
        ? b.tags.slice(0, 12).map((x) => String(x).slice(0, 24))
        : existing?.tags || [],
      enabled:
        b.enabled !== undefined ? !!b.enabled : existing?.enabled !== false,
      createdAt: existing?.createdAt || Date.now(),
    };
    if (!model.providerId)
      return error("Model providerId is required", 400, request, env);
    if (!model.upstreamModel)
      return error("Model upstreamModel is required", 400, request, env);
    await sput(env, `model:${id}`, model);
    return json(
      {
        model,
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}

// ── User admin handler ───────────────────────────────────
async function handleAdminUpdateUser(request, env) {
  try {
    const { id, role, status, creditsDelta } = await request.json();
    const user = await sget(env, `user:${id}`);
    if (!user) return error("User not found", 404, request, env);
    if (role && ["user", "admin", "moderator"].includes(role)) user.role = role;
    if (status && ["active", "banned"].includes(status)) user.status = status;
    if (Number.isFinite(creditsDelta))
      user.credits = Math.max(0, (user.credits || 0) + creditsDelta);
    await sput(env, `user:${user.id}`, user);
    return json(
      {
        user: publicUser(user),
      },
      200,
      request,
      env,
    );
  } catch (e) {
    return error(e.message, 500, request, env);
  }
}
async function handleProfile(request, env) {
  const user = await getBearerUser(request, env);
  if (!user) return error("Authentication required", 401, request, env);
  const { name } = await request.json();
  if (typeof name !== "string" || !name.trim() || name.length > 80)
    return error("Enter a name from 1 to 80 characters", 400, request, env);
  user.name = name.trim();
  await sput(env, "user:" + user.id, user);
  return json(
    {
      user: publicUser(user),
    },
    200,
    request,
    env,
  );
}
async function handlePasswordChange(request, env) {
  const user = await getBearerUser(request, env);
  if (!user) return error("Authentication required", 401, request, env);
  const { currentPassword, newPassword } = await request.json();
  if (
    typeof newPassword !== "string" ||
    newPassword.length < 12 ||
    newPassword.length > 256
  )
    return error(
      "New password must contain 12 to 256 characters",
      400,
      request,
      env,
    );
  const old = await hashPassword(
    String(currentPassword || ""),
    user.passwordSalt,
  );
  if (!timingSafeEqual(old.hash, user.passwordHash))
    return error("Current password is incorrect", 403, request, env);
  const next = await hashPassword(newPassword);
  user.passwordSalt = next.salt;
  user.passwordHash = next.hash;
  await sput(env, "user:" + user.id, user);
  const sessions = await slist(env, "sess:");
  // Sessions are revoked through keyed listing so password changes affect all devices.
  if (env.SESSIONS) {
    let cursor;
    do {
      const page = await env.SESSIONS.list({
        prefix: "sess:",
        cursor,
      });
      for (const key of page.keys) {
        const session = await sget(env, key.name);
        if (session?.userId === user.id) await sdel(env, key.name);
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);
  } else if (env.DB)
    for (const row of (
      await env.DB.prepare("SELECT k,v FROM kv WHERE k LIKE 'sess:%'").all()
    ).results || []) {
      const session = await sget(env, row.k);
      if (session?.userId === user.id) await sdel(env, row.k);
    }
  return json(
    {
      ok: true,
      reauthenticate: true,
    },
    200,
    request,
    env,
  );
}
