import {
  chatAPI,
  streamChatAPI,
  reliableChatAPI,
  requestJSON,
} from "./api-client.js";
function getInitialLang() {
  try {
    let e = localStorage.getItem(`chatoop_rt_lang`);
    if (e === `zh` || e === `en`) return e;
  } catch {}
  return typeof navigator < `u` && /^zh/i.test(navigator.language || ``)
    ? `zh`
    : `en`;
}
let API_BASE_URL = (import.meta.env?.VITE_API_URL || "").replace(/\/$/, "");
let API_TIMEOUT_MS = 2e4;
function classifyError(e) {
  let t = (e || ``).toString();
  return /OPENROUTER_API_KEY|not configured|does not look like an OpenRouter key/i.test(
    t,
  )
    ? `config`
    : /failed to fetch|networkerror|load failed|network request failed/i.test(t)
      ? `network`
      : /rate limit|too many requests/i.test(t)
        ? `rate`
        : /origin is not allowed|site is not allowed/i.test(t)
          ? `origin`
          : /missing|required|too long|select .*model|unknown model|no valid chat messages|every message/i.test(
                t,
              )
            ? `validation`
            : /not a valid model|no endpoints found|model.*(not found|unavailable|does not exist)|\b404\b/i.test(
                  t,
                )
              ? `model`
              : /openrouter\s*\d{3}|\b(429|500|502|503)\b|rate limit|upstream/i.test(
                    t,
                  )
                ? `upstream`
                : `generic`;
}
let AUTH_TOKEN_KEY = `chatoop_rt_token_v1`;
function authToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || ``;
  } catch {
    return ``;
  }
}
function setAuthToken(e) {
  try {
    e
      ? localStorage.setItem(AUTH_TOKEN_KEY, e)
      : localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}
async function postAPI(path, body, options = {}) {
  return requestJSON(path, body, options);
}
async function callAPI(e, t, n) {
  let r = await postAPI(`/api/chat`, {
    model: e,
    system: t,
    messages: [
      {
        role: `user`,
        content: n,
      },
    ],
  });
  return {
    ...r,
    reply: r.reply || `[no response]`,
  };
}
async function callVoteAPI(e, t, n, r, i, a = `en`, o = false) {
  return (
    (
      await postAPI(
        `/api/vote`,
        {
          topic: e,
          models: t,
          context: n,
          options: r,
          round1Votes: i,
          language: a,
          allowAbstain: o,
        },
        {
          timeoutMs: 6e4,
        },
      )
    ).votes || []
  );
}
async function callSummaryAPI(e, t, n) {
  return (
    (
      await postAPI(`/api/summary`, {
        topic: e,
        context: t,
        votes: n,
      })
    ).summary || `[no summary]`
  );
}
async function signupAPI(e, t, n) {
  return postAPI(`/api/auth/signup`, {
    email: e,
    password: t,
    name: n,
  });
}
async function loginAPI(e, t) {
  return postAPI(`/api/auth/login`, {
    email: e,
    password: t,
  });
}
async function requestPasswordResetAPI(e) {
  return postAPI(`/api/auth/request-password-reset`, {
    email: e,
  });
}
async function logoutAPI() {
  try {
    return await postAPI(`/api/auth/logout`, {});
  } catch {
    return null;
  }
}
async function meAPI() {
  return getAPI(`/api/auth/me`);
}
async function walletAPI() {
  return getAPI(`/api/wallet`);
}
async function recordUsageAPI(e) {
  return postAPI(`/api/wallet/usage`, e);
}
async function addDemoCreditsAPI() {
  return postAPI(`/api/wallet/add-demo`, {});
}
async function adminProvidersAPI() {
  return getAPI(`/api/admin/providers`);
}
async function saveProviderAPI(e) {
  return postAPI(`/api/admin/providers`, e);
}
async function deleteProviderAPI(e) {
  return postAPI(`/api/admin/providers/delete`, {
    id: e,
  });
}
async function testProviderAPI(e, t) {
  return postAPI(`/api/admin/providers/test`, {
    id: e,
    model: t,
  });
}
async function syncProviderModelsAPI(e) {
  return postAPI(
    `/api/admin/providers/sync-models`,
    {
      id: e,
    },
    {
      timeoutMs: 12e4,
    },
  );
}
async function modelsAPI() {
  return getAPI(`/api/models`);
}
async function adminModelsAPI() {
  return getAPI(`/api/admin/models`);
}
async function saveModelAPI(e) {
  return postAPI(`/api/admin/models`, e);
}
async function deleteModelAPI(e) {
  return postAPI(`/api/admin/models/delete`, {
    id: e,
  });
}
async function adminRegistryAPI() {
  let [e, t] = await Promise.allSettled([
      adminProvidersAPI(),
      adminModelsAPI(),
    ]),
    n = (e.status === `fulfilled` && e.value.providers) || [],
    r = (t.status === `fulfilled` && t.value.models) || [],
    i = [e, t]
      .filter((e) => e.status === `rejected`)
      .map((e) => e.reason?.detail || e.reason?.message || `Admin API failed`);
  return {
    providers: n,
    models: r,
    error: i.length
      ? Object.assign(Error(i.join(` / `)), {
          detail: i.join(` / `),
        })
      : null,
  };
}
let DISCUSSION_CATEGORIES = [
  `Fun & Hypothetical`,
  `Philosophy`,
  `Ethics`,
  `Technology`,
  `Culture`,
  `Business`,
  `Politics`,
  `Personal`,
  `Other`,
];
let CATEGORY_KEYWORDS = [
  [
    `Technology`,
    `ai.model.software.code.programming.developer.startup.data.privacy.security.robot.automation.internet.algorithm.app.cloud.tech.人工智能.模型.软件.代码.编程.开发.数据.隐私.安全.机器人.自动化.互联网.算法.应用.云`.split(
      `.`,
    ),
  ],
  [
    `Business`,
    `work.job.company.business.market.product.pricing.customer.management.finance.investment.startup.salary.office.remote.productivity.career.工作.职业.公司.商业.市场.产品.定价.客户.管理.财务.投资.创业.工资.办公室.远程.效率.职场`.split(
      `.`,
    ),
  ],
  [
    `Politics`,
    `government.policy.law.election.city.public.tax.regulation.school.healthcare.transit.country.state.rights.ban.政府.政策.法律.选举.城市.公共.税.监管.学校.医疗.公交.国家.权利.禁止`.split(
      `.`,
    ),
  ],
  [
    `Ethics`,
    `should.ethical.moral.fair.justice.harm.safe.responsible.bias.consent.surveillance.minimum age.rights.应该.伦理.道德.公平.正义.伤害.安全.负责.偏见.同意.监控.年龄限制.权利`.split(
      `.`,
    ),
  ],
  [
    `Culture`,
    `book.movie.music.art.culture.fiction.non-fiction.game.sports.food.pizza.language.media.fashion.travel.书.电影.音乐.艺术.文化.小说.游戏.体育.食物.披萨.语言.媒体.时尚.旅行`.split(
      `.`,
    ),
  ],
  [
    `Philosophy`,
    [
      `meaning`,
      `truth`,
      `free will`,
      `consciousness`,
      `happiness`,
      `exist`,
      `life`,
      `mind`,
      `knowledge`,
      `belief`,
      `better life`,
      `purpose`,
      `意义`,
      `真理`,
      `自由意志`,
      `意识`,
      `幸福`,
      `存在`,
      `人生`,
      `心灵`,
      `知识`,
      `信念`,
      `目的`,
    ],
  ],
  [
    `Personal`,
    `relationship.family.friend.home.house.rent.commute.habit.health.fitness.sleep.study.move.personal.money buy happiness.关系.家庭.朋友.家.房子.租房.通勤.习惯.健康.健身.睡眠.学习.搬家.个人`.split(
      `.`,
    ),
  ],
  [
    `Fun & Hypothetical`,
    [
      `would you rather`,
      `hypothetical`,
      `fun`,
      `silly`,
      `superpower`,
      `alien`,
      `zombie`,
      `time travel`,
      `pineapple`,
      `tabs or spaces`,
      `假如`,
      `脑洞`,
      `有趣`,
      `超能力`,
      `外星`,
      `时间旅行`,
      `菠萝`,
      `披萨`,
      `制表符`,
      `空格`,
    ],
  ],
];
function classifyDiscussionCategory(e, t = ``) {
  let n = `${e || ``} ${t || ``}`.toLowerCase();
  if (!n.trim()) return `Other`;
  let r = new Map();
  return (
    CATEGORY_KEYWORDS.forEach(([e, t]) => {
      t.forEach((t) => {
        let i = String(t).toLowerCase();
        i &&
          n.includes(i) &&
          r.set(e, (r.get(e) || 0) + Math.max(1, Math.min(3, i.length / 4)));
      });
    }),
    Array.from(r.entries()).sort((e, t) => t[1] - e[1])[0]?.[0] || `Other`
  );
}
function discussionTypeLabel(e, t) {
  let n = t === `open`;
  return e === `debate`
    ? n
      ? `Open Debate`
      : `Debate`
    : n
      ? `Open Poll`
      : `Poll`;
}
let MODEL_THEME_RULES = [
  [/claude|anthropic|opus|haiku|sonnet/i, `Cl`, `#D97706`],
  [/gemini|google|bard/i, `G`, `#7C3AED`],
  [/gpt|openai|chatgpt|^o[134]/i, `G4`, `#10B981`],
  [/deepseek/i, `DS`, `#2563EB`],
  [/qwen|alibaba|tongyi|通义/i, `Q`, `#6366F1`],
  [/grok|xai/i, `X`, `#111827`],
  [/kimi|moonshot/i, `KM`, `#EA580C`],
  [/llama|meta/i, `Lm`, `#DB2777`],
  [/perplexity|sonar/i, `PX`, `#0891B2`],
  [/glm|zhipu|智谱/i, `GL`, `#0EA5E9`],
  [/mistral/i, `Mi`, `#F97316`],
  [/step/i, `St`, `#0D9488`],
  [/hunyuan|腾讯/i, `Hy`, `#1D4ED8`],
  [/ernie|文心|baidu|百度/i, `Er`, `#2563EB`],
  [/doubao|豆包|volc/i, `Db`, `#4F46E5`],
];
function modelTheme(e) {
  let t = String(e || ``);
  for (let [e, n, r] of MODEL_THEME_RULES)
    if (e.test(t))
      return {
        symbol: n,
        color: r,
      };
  return {
    symbol: (
      t.replace(/[^A-Za-z0-9一-龥]/g, ``).slice(0, 2) || `AI`
    ).toUpperCase(),
    color: `#64748B`,
  };
}
function queryString(e) {
  let t = new URLSearchParams();
  return (
    Object.entries(e || {}).forEach(([e, n]) => {
      n !== `` && n != null && t.set(e, String(n));
    }),
    t.toString()
  );
}
async function getAPI(path) {
  return requestJSON(path, undefined, {
    method: "GET",
  });
}
let EXAMPLE_DISCUSSIONS = [];
function hydrateExampleDiscussion(e) {
  return e;
}
function exampleDiscussionIndex(e) {
  let t = Date.now(),
    n = EXAMPLE_DISCUSSIONS.map((e, n) => ({
      id: `seed_${n + 1}`,
      question: e.q,
      mode: e.mode,
      answerType: e.answerType,
      category: e.cat,
      lang: e.lang,
      models: e.models.length,
      modelNames: e.models,
      upvotes: e.up,
      createdAt: t - e.agoH * 3600 * 1e3,
      modeLabel: discussionTypeLabel(e.mode, e.answerType),
    })),
    {
      sort: r = `hot`,
      category: i = ``,
      mode: a = ``,
      lang: o = ``,
      q: s = ``,
      page: c = 1,
      pageSize: l = 12,
    } = e || {};
  (i && (n = n.filter((e) => e.category === i)),
    a && (n = n.filter((e) => e.mode === a)),
    o && (n = n.filter((e) => (e.lang || `en`) === o)),
    s &&
      (n = n.filter((e) =>
        e.question.toLowerCase().includes(String(s).toLowerCase()),
      )),
    r === `new`
      ? n.sort((e, t) => t.createdAt - e.createdAt)
      : n.sort((e, t) => t.upvotes - e.upvotes));
  let u = n.length,
    d = (c - 1) * l;
  return {
    items: n.slice(d, d + l),
    total: u,
    page: c,
    pages: Math.max(1, Math.ceil(u / l)),
    categories: DISCUSSION_CATEGORIES,
    sort: r,
    fallback: true,
  };
}
let archivedDiscussionCache = null;
async function loadArchivedDiscussions() {
  return {
    items: [],
    total: 0,
    pages: 1,
    categories: [],
  };
}
async function loadArchivedDiscussionDetail(e) {
  return null;
}
function filterDiscussionItems(e, t) {
  let n = Array.isArray(e) ? e.slice() : [],
    {
      sort: r = `hot`,
      category: i = ``,
      mode: a = ``,
      lang: o = ``,
      q: s = ``,
      page: c = 1,
      pageSize: l = 12,
    } = t || {};
  (i && (n = n.filter((e) => e.category === i)),
    a && (n = n.filter((e) => e.mode === a)),
    o && (n = n.filter((e) => (e.lang || `en`) === o)),
    s &&
      (n = n.filter((e) =>
        String(e.question || ``)
          .toLowerCase()
          .includes(String(s).toLowerCase()),
      )),
    r === `new`
      ? n.sort((e, t) => (t.createdAt || 0) - (e.createdAt || 0))
      : n.sort((e, t) => (t.upvotes || 0) - (e.upvotes || 0)));
  let u = n.length,
    d = Math.max(1, Number(c) || 1),
    f = Math.max(1, Number(l) || 12),
    p = (d - 1) * f;
  return {
    items: n.slice(p, p + f),
    total: u,
    page: d,
    pageSize: f,
    pages: Math.max(1, Math.ceil(u / f)),
    categories: DISCUSSION_CATEGORIES,
    sort: r,
    source: `instance-public-history`,
  };
}
async function loadDiscussionIndex(e) {
  let t = (await loadArchivedDiscussions()).items || [],
    n;
  try {
    n = await getAPI(
      `/api/discussions?` +
        queryString({
          ...e,
          page: 1,
          pageSize: 50,
        }),
    );
  } catch {}
  let r = Array.isArray(n?.items) ? n.items : [],
    i = new Set();
  return filterDiscussionItems(
    [...t, ...r].filter((e) => {
      let t = e.id || e.question;
      return !t || i.has(t) ? false : (i.add(t), true);
    }),
    e,
  );
}
function statsWindowStart(e) {
  let t = Date.now();
  return e === `24h`
    ? t - 24 * 3600 * 1e3
    : e === `7d`
      ? t - 168 * 3600 * 1e3
      : 0;
}
function consensusBucketFromVotes(e, t) {
  let n = Math.max(0, e?.length || t || 0);
  if (!n) return `No vote`;
  let r = new Map();
  (e || []).forEach((e) => {
    let t = String(e.finalVote || e.vote || `INVALID`).toUpperCase();
    r.set(t, (r.get(t) || 0) + 1);
  });
  let i = Math.max(0, ...r.values()) / n;
  return i >= 1
    ? `Unanimous`
    : i >= 0.75
      ? `Strong majority`
      : i > 0.5
        ? `Majority`
        : `No consensus`;
}
function analyzeVotesForStats(e) {
  let t = Array.isArray(e)
      ? e.slice(0, 20).map((e) => {
          let t =
              String(e.finalVote || e.vote || `INVALID`).trim() || `INVALID`,
            n =
              String(
                e.round1Vote || e.firstVote || e.initialVote || t,
              ).trim() || t;
          return {
            ...e,
            round1Vote: n,
            finalVote: t,
            vote: t,
            flipped: !!(e.flipped ?? n.toUpperCase() !== t.toUpperCase()),
          };
        })
      : [],
    n = new Map();
  t.forEach((e) => {
    let t = String(e.finalVote || `INVALID`).toUpperCase();
    n.set(t, (n.get(t) || 0) + 1);
  });
  let r = Math.max(0, ...n.values()),
    i = new Set(
      Array.from(n.entries())
        .filter(([, e]) => e === r && r > 0)
        .map(([e]) => e),
    ),
    a = t.map((e) => ({
      ...e,
      onWinningSide:
        e.onWinningSide ??
        i.has(String(e.finalVote || `INVALID`).toUpperCase()),
    }));
  return {
    votes: a,
    voteStats: {
      totalVotes: a.length,
      flippedCount: a.filter((e) => e.flipped).length,
      winningVotes: a.filter((e) => e.onWinningSide).length,
      consensus: consensusBucketFromVotes(a, a.length),
    },
  };
}
function computeStatsPayload(e, t = new Date().toISOString(), n = `all`) {
  let r = Array.isArray(e) ? e : [],
    i = statsWindowStart(n),
    a = i ? r.filter((e) => (e.createdAt || 0) >= i) : r,
    o = (e) => {
      let t = new Map();
      return (
        a.forEach((n) => {
          let r = e(n) || `Other`;
          t.set(r, (t.get(r) || 0) + 1);
        }),
        Array.from(t.entries())
          .map(([e, t]) => ({
            label: e,
            count: t,
          }))
          .sort((e, t) => t.count - e.count)
      );
    },
    s = new Map(),
    c = 0;
  a.forEach((e) => {
    ((c += Number(e.models) || 0),
      (Array.isArray(e.modelNames) && e.modelNames.length
        ? e.modelNames
        : [`${e.models || 0} selected models`]
      ).forEach((e) => s.set(e, (s.get(e) || 0) + 1)));
  });
  let l = Array.from(s.entries())
      .map(([e, t]) => ({
        model: e,
        count: t,
      }))
      .sort((e, t) => t.count - e.count),
    u = o((e) => e.category),
    d = o((e) => (e.lang || `en`).toUpperCase()),
    f = o((e) => e.modeLabel || discussionTypeLabel(e.mode, e.answerType)),
    p = o((e) => consensusBucketFromVotes(e.votes, e.models)),
    m = a.flatMap((e) => analyzeVotesForStats(e.votes).votes),
    h = new Map();
  m.forEach((e) => {
    let t = e.modelName || e.modelId || `Model`,
      n = h.get(t) || {
        model: t,
        count: 0,
        flips: 0,
        kept: 0,
        wins: 0,
      };
    ((n.count += 1),
      e.flipped ? (n.flips += 1) : (n.kept += 1),
      e.onWinningSide && (n.wins += 1),
      h.set(t, n));
  });
  let g = Array.from(h.values()),
    _ = g
      .map((e) => ({
        model: e.model,
        flips: e.flips,
        count: e.count,
      }))
      .sort((e, t) => t.flips - e.flips || t.count - e.count),
    v = g
      .map((e) => ({
        model: e.model,
        keptRate: e.count ? Math.round((e.kept / e.count) * 100) : 0,
        count: e.count,
      }))
      .sort((e, t) => t.keptRate - e.keptRate || t.count - e.count),
    y = g
      .map((e) => ({
        model: e.model,
        flipRate: e.count ? Math.round((e.flips / e.count) * 100) : 0,
        count: e.count,
      }))
      .sort((e, t) => t.flipRate - e.flipRate || t.count - e.count),
    b = g
      .map((e) => ({
        model: e.model,
        count: e.count,
        winRate: e.count ? Math.round((e.wins / e.count) * 100) : 0,
      }))
      .sort((e, t) => t.winRate - e.winRate || t.count - e.count),
    x = u.map((e) => {
      let t = a.filter((t) => (t.category || `Other`) === e.label),
        n = t.filter(
          (e) =>
            ![`No consensus`, `No vote`].includes(
              consensusBucketFromVotes(e.votes, e.models),
            ),
        ).length;
      return {
        label: e.label,
        count: e.count,
        consensusRate: t.length ? Math.round((n / t.length) * 100) : 0,
      };
    });
  return {
    generatedAt: t,
    schemaVersion: 2,
    window: n,
    totalSessions: {
      all: r.length,
      window: a.length,
    },
    responseCount: c,
    highlights: {
      topMode: f[0]?.label || `—`,
      topCategory: u[0]?.label || `—`,
      mostUsedModel: l[0]?.model || `—`,
      topLanguage: d[0]?.label || `—`,
      highestConviction: v[0]?.keptRate || 0,
      mostInfluentialModel: _[0]?.model || `—`,
    },
    modelUsage: l,
    categories: u,
    languages: d,
    modes: f,
    consensusOutcomes: p,
    categoryConsensus: x,
    mostInfluentialModels: _,
    conviction: v,
    mostPersuadable: y,
    winRate: b,
    skippedDebateShare: a.length
      ? Math.round((a.filter((e) => e.mode === `vote`).length / a.length) * 100)
      : 0,
  };
}
async function listDiscussionsAPI(e) {
  return loadDiscussionIndex(e);
}
async function upvoteDiscussionAPI(e) {
  try {
    return await postAPI(
      `/api/discussions/${encodeURIComponent(e)}/upvote`,
      {},
    );
  } catch {
    return null;
  }
}
async function publishDiscussionAPI(e) {
  try {
    return await postAPI(`/api/discussions`, e);
  } catch {
    return null;
  }
}
async function getDiscussionAPI(e) {
  try {
    return hydrateExampleDiscussion(
      await getAPI(`/api/discussions/${encodeURIComponent(e)}`),
    );
  } catch (t) {
    let n = await loadArchivedDiscussionDetail(e);
    if (n) return n;
    let r = exampleDiscussionIndex({
      pageSize: 50,
    }).items.find((t) => t.id === e);
    if (r) return hydrateExampleDiscussion(r);
    throw t;
  }
}
async function statsAPI(e = `all`) {
  try {
    return await getAPI(`/api/stats?window=${encodeURIComponent(e)}`);
  } catch {
    return computeStatsPayload(
      exampleDiscussionIndex({
        pageSize: 50,
      }).items,
      new Date().toISOString(),
      e,
    );
  }
}
async function synthesizeAPI(e, t) {
  return (
    (
      await postAPI(`/api/synthesize`, {
        topic: e,
        answers: t,
      })
    ).reply || ``
  );
}
function isIncompleteReply(e) {
  let t = String(e || ``).trim();
  return t
    ? t.length < 24
      ? !/[.!?\u3002\uff01\uff1f\u2026\uff09\u3011\u300d\u300f\u201d\u2019)\]]$/.test(
          t,
        )
      : /[。！？.!?…）」』”’）\]]$/.test(t)
        ? false
        : /[\u3400-\u9fff]$/.test(t)
          ? true
          : /[\p{L}\p{N}"'“‘（(，,、；;：:]$/u.test(t)
    : true;
}
async function completeReplyAPI(e, t, n) {
  return await chatAPI(e, [
    ...t,
    {
      role: `assistant`,
      content: String(n || ``),
    },
    {
      role: `user`,
      content: [
        `Your previous answer was cut off or incomplete.`,
        `Rewrite the complete answer from the beginning in the user's language.`,
        `Keep it concise, 2-4 sentences.`,
        `End with a complete sentence and final punctuation.`,
      ].join(`
`),
    },
  ]);
}
let timeLabel = () =>
  new Date().toLocaleTimeString([], {
    hour: `2-digit`,
    minute: `2-digit`,
  });
let generateId = () => `rt_${Date.now()}`;
let nowMs = () => Date.now();
let CURRENT_MEETING_KEY = `chatoop_rt_current_v1`;
let MEETING_HISTORY_KEY = `chatoop_rt_history_v1`;
let DEFAULT_MODELS_KEY = `chatoop_rt_default_models_v1`;
let LANGUAGE_KEY = 10;
let MAX_LOCAL_STORAGE_CHARS = 6e4;
function safeGet(e) {
  try {
    return JSON.parse(localStorage.getItem(e) || `null`);
  } catch {
    return null;
  }
}
function safeSet(e, t) {
  try {
    localStorage.setItem(e, JSON.stringify(t));
  } catch {}
}
function loadUser() {
  let e = safeGet(AUTH_USER_KEY);
  return e && e.email ? e : null;
}
function loadWallet() {
  let e = safeGet(WALLET_KEY);
  return e && typeof e.balance == `number`
    ? e
    : {
        balance: 5,
        starting: 5,
        used: 0,
      };
}
function loadUsage() {
  let e = safeGet(USAGE_KEY);
  return Array.isArray(e) ? e : [];
}
function loadDisabledModels() {
  let e = safeGet(DISABLED_MODELS_KEY);
  return Array.isArray(e)
    ? e
        .filter((e) => typeof e == `string` && e.trim())
        .filter((e, t, n) => n.indexOf(e) === t)
    : [];
}
function loadMeetingHistory() {
  let e = safeGet(MEETING_HISTORY_KEY);
  return Array.isArray(e) ? e : [];
}
function saveMeetingHistory(e) {
  if (!e || !e.msgs || e.msgs.length < 2) return;
  let t = loadMeetingHistory().filter((t) => t.id !== e.id);
  (t.unshift(e), safeSet(MEETING_HISTORY_KEY, t.slice(0, LANGUAGE_KEY)));
}
function meetingMarkdown(
  e,
  { topic: t, mode: n, msgs: r, votes: i, summary: a },
) {
  let o = e(`mode_${n}`),
    s = (r || [])
      .filter((e) => e.type === `model`)
      .reduce((e, t) => (e.includes(t.modelName) ? e : [...e, t.modelName]), [])
      .join(`, `),
    c = (r || [])
      .filter((e) => e.type !== `system`)
      .map((t) => {
        if (t.type === `host`) return `**[${e(`md_host`)}]** ${t.content}`;
        if (t.type === `user`) return `**[${e(`md_user`)}]** ${t.content}`;
        let n = t.fallbackUsed
          ? ` · ${e(`fallbackBadge`)}: ${t.modelUsed || `yes`}`
          : ``;
        return `**${t.modelName}** _(${t.time || ``}${n})_\n\n${t.content}`;
      }).join(`

`),
    l =
      i && i.length
        ? i.map((t) => {
            let n = t.fallbackUsed
                ? ` (${e(`fallbackBadge`)}: ${t.modelUsed || `yes`})`
                : ``,
              r = t.round1Vote
                ? ` (${e(`round1VoteLabel`)}: ${t.round1Vote} -> ${e(`finalVoteLabel`)}: ${t.finalVote || t.vote}${t.flipped ? `, ${e(`voteChanged`)}` : `, ${e(`voteHeld`)}`})`
                : ``;
            return `- **${t.modelName}**${n}: ${t.finalVote || t.vote}${r} — ${t.reason}`;
          }).join(`
`)
        : `_—_`;
  return [
    `# ${e(`md_title`)}`,
    ``,
    `- **${e(`md_topic`)}:** ${t || `—`}`,
    `- **${e(`md_mode`)}:** ${o}`,
    `- **${e(`md_models`)}:** ${s || `—`}`,
    `- **${e(`md_generatedAt`)}:** ${new Date().toLocaleString()}`,
    ``,
    `## ${e(`md_transcript`)}`,
    ``,
    c || `_—_`,
    ``,
    `## ${e(`md_votes`)}`,
    ``,
    l,
    ``,
    `## ${e(`md_summary`)}`,
    ``,
    a || `_—_`,
    ``,
  ].join(`
`);
}
function slugify(e) {
  return (
    (e || `meeting`)
      .toLowerCase()
      .replace(/[^\w一-龥]+/g, `-`)
      .replace(/^-+|-+$/g, ``)
      .slice(0, 40) || `meeting`
  );
}
let DEFAULT_MODEL_IDS = [`claude`, `gemini`, `gpt4o`, `deepseek`];
let AUTH_USER_KEY = `chatoop_rt_auth_user_v1`;
let WALLET_KEY = `chatoop_rt_wallet_v1`;
let USAGE_KEY = `chatoop_rt_usage_v1`;
let DISABLED_MODELS_KEY = `chatoop_rt_disabled_models_v1`;
let CHAT_SESSIONS_KEY = `chatoop_rt_chat_sessions_v1`;
let ACTIVE_CHAT_KEY = `chatoop_rt_chat_active_v1`;
function normalizeMeetingModels(e) {
  if (!Array.isArray(e)) return null;
  let t = e
    .filter((e) => typeof e == `string` && e.trim())
    .filter((e, t, n) => n.indexOf(e) === t);
  return t.length >= 2 && t.length <= 6 ? t : null;
}
function normalizeChatModels(e) {
  if (!Array.isArray(e)) return null;
  let t = e
    .filter((e) => typeof e == `string` && e.trim())
    .filter((e, t, n) => n.indexOf(e) === t);
  return t.length >= 1 && t.length <= 6 ? t : null;
}
function parseCustomOptions(e) {
  return String(e || ``)
    .split(/[,\n，、]/)
    .map((e) => e.trim())
    .filter(Boolean)
    .filter(
      (e, t, n) =>
        n.findIndex((t) => t.toLowerCase() === e.toLowerCase()) === t,
    )
    .slice(0, 6);
}
function voteOptionsForType(e, t) {
  return e === `custom`
    ? parseCustomOptions(t)
    : e === `yesno`
      ? [`YES`, `NO`]
      : [];
}
function loadDefaultModels() {
  return (
    normalizeMeetingModels(safeGet(DEFAULT_MODELS_KEY)) || DEFAULT_MODEL_IDS
  );
}
function chatTitle(e) {
  let t = Array.isArray(e)
    ? e.find((e) => e.role === `user` && String(e.content || ``).trim())
    : null;
  return String(t?.content || ``)
    .trim()
    .replace(/\s+/g, ` `)
    .slice(0, 64);
}
function normalizeChatSession(e) {
  let t = Array.isArray(e?.msgs)
      ? e.msgs.slice(-300).map((message) => ({
          ...message,
          streaming: false,
          loading: false,
          summaryLoading: false,
        }))
      : [],
    n = normalizeChatModels(e?.models) || DEFAULT_MODEL_IDS,
    r = String(e?.title || chatTitle(t) || ``).trim();
  return {
    id: String(e?.id || generateId()),
    title: r,
    msgs: t,
    mode: e?.mode === `single` ? `single` : `roundtable`,
    models: n,
    updatedAt: Number(e?.updatedAt) || Date.now(),
  };
}
function newChatSession(e = {}) {
  return normalizeChatSession({
    id: generateId(),
    title: ``,
    msgs: [],
    mode: `roundtable`,
    models: loadDefaultModels(),
    updatedAt: Date.now(),
    ...e,
  });
}
function loadChatSessions() {
  let e = safeGet(CHAT_SESSIONS_KEY),
    t = Array.isArray(e) ? e.map(normalizeChatSession).filter((e) => e.id) : [];
  return (t.length ? t : [newChatSession()])
    .sort((e, t) => t.updatedAt - e.updatedAt)
    .slice(0, 20);
}
function loadInitialMeeting() {
  let e = safeGet(CURRENT_MEETING_KEY);
  return e && Array.isArray(e.msgs) && e.msgs.length > 1
    ? {
        restored: true,
        topic: e.topic || ``,
        selected: normalizeMeetingModels(e.models) || loadDefaultModels(),
        mode: e.mode || `discussion`,
        answerType: e.answerType || (e.mode === `vote` ? `yesno` : `open`),
        customOptionsText: e.customOptionsText || ``,
        msgs: e.msgs || [],
        votes: e.votes || [],
        round1Votes: e.round1Votes || [],
        summary: e.summary || ``,
        sessionId: e.id || generateId(),
        phase: e.phase && e.phase !== `setup` ? e.phase : `meeting`,
      }
    : {
        restored: false,
        topic: ``,
        selected: loadDefaultModels(),
        mode: `discussion`,
        answerType: `open`,
        customOptionsText: ``,
        msgs: [],
        votes: [],
        round1Votes: [],
        summary: ``,
        sessionId: null,
        phase: `setup`,
      };
}
function loadInitialRoute() {
  if (typeof window > `u`)
    return {
      route: `home`,
      detailId: null,
    };
  let e = (window.location.pathname.replace(/\/+$/, ``) || `/`)
      .split(`/`)
      .filter(Boolean),
    t = e.indexOf(`ai-roundtable`),
    n = t >= 0 ? e.slice(t + 1) : e;
  return n[0] === `history`
    ? {
        route: `history`,
        detailId: null,
      }
    : n[0] === `chat`
      ? {
          route: `chat`,
          detailId: null,
        }
      : n[0] === `stats`
        ? {
            route: `stats`,
            detailId: null,
          }
        : n[0] === `about`
          ? {
              route: `about`,
              detailId: null,
            }
          : n[0] === `dashboard`
            ? {
                route: `dashboard`,
                detailId: null,
              }
            : n[0] === `wallet`
              ? {
                  route: `wallet`,
                  detailId: null,
                }
              : n[0] === `admin`
                ? {
                    route: `admin`,
                    detailId: null,
                  }
                : n[0] === `login`
                  ? {
                      route: `login`,
                      detailId: null,
                    }
                  : n[0] === `signup`
                    ? {
                        route: `signup`,
                        detailId: null,
                      }
                    : n[0] === `questions` && n[1]
                      ? {
                          route: `question`,
                          detailId: decodeURIComponent(n[1]),
                        }
                      : {
                          route: `home`,
                          detailId: null,
                        };
}
function routePath(e, t) {
  let n = `/ai-roundtable`;
  return e === `history`
    ? `${n}/history`
    : e === `chat`
      ? `${n}/chat`
      : e === `stats`
        ? `${n}/stats`
        : e === `about`
          ? `${n}/about`
          : e === `dashboard`
            ? `${n}/dashboard`
            : e === `wallet`
              ? `${n}/wallet`
              : e === `admin`
                ? `${n}/admin`
                : e === `login`
                  ? `${n}/login`
                  : e === `signup`
                    ? `${n}/signup`
                    : e === `question` && t
                      ? `${n}/questions/${encodeURIComponent(t)}`
                      : n;
}
function historyPageFromURL() {
  return typeof window > `u`
    ? 1
    : Math.max(
        1,
        parseInt(
          new URLSearchParams(window.location.search).get(`page`) || `1`,
          10,
        ) || 1,
      );
}
function downloadMarkdown(e, t) {
  try {
    let n = new Blob([t], {
        type: `text/markdown;charset=utf-8`,
      }),
      r = URL.createObjectURL(n),
      i = document.createElement(`a`);
    ((i.href = r),
      (i.download = e),
      document.body.appendChild(i),
      i.click(),
      document.body.removeChild(i),
      setTimeout(() => URL.revokeObjectURL(r), 0));
  } catch {}
}
function formatFileSize(e) {
  let t = Number(e) || 0;
  return t < 1024
    ? `${t} B`
    : t < 1024 * 1024
      ? `${(t / 1024).toFixed(1)} KB`
      : `${(t / (1024 * 1024)).toFixed(1)} MB`;
}
function isTextAttachment(e) {
  let t = String(e?.name || ``).toLowerCase();
  return (
    String(e?.type || ``)
      .toLowerCase()
      .startsWith(`text/`) ||
    /\.(txt|md|markdown|json|csv|tsv|log|js|jsx|ts|tsx|css|html|xml|yaml|yml)$/i.test(
      t,
    )
  );
}
export {
  getInitialLang,
  API_BASE_URL,
  API_TIMEOUT_MS,
  classifyError,
  AUTH_TOKEN_KEY,
  authToken,
  setAuthToken,
  postAPI,
  callAPI,
  callVoteAPI,
  callSummaryAPI,
  signupAPI,
  loginAPI,
  requestPasswordResetAPI,
  logoutAPI,
  meAPI,
  walletAPI,
  recordUsageAPI,
  addDemoCreditsAPI,
  adminProvidersAPI,
  saveProviderAPI,
  deleteProviderAPI,
  testProviderAPI,
  syncProviderModelsAPI,
  modelsAPI,
  adminModelsAPI,
  saveModelAPI,
  deleteModelAPI,
  adminRegistryAPI,
  DISCUSSION_CATEGORIES,
  CATEGORY_KEYWORDS,
  classifyDiscussionCategory,
  discussionTypeLabel,
  MODEL_THEME_RULES,
  modelTheme,
  queryString,
  getAPI,
  EXAMPLE_DISCUSSIONS,
  hydrateExampleDiscussion,
  exampleDiscussionIndex,
  archivedDiscussionCache,
  loadArchivedDiscussions,
  loadArchivedDiscussionDetail,
  filterDiscussionItems,
  loadDiscussionIndex,
  statsWindowStart,
  consensusBucketFromVotes,
  analyzeVotesForStats,
  computeStatsPayload,
  listDiscussionsAPI,
  upvoteDiscussionAPI,
  publishDiscussionAPI,
  getDiscussionAPI,
  statsAPI,
  synthesizeAPI,
  chatAPI,
  streamChatAPI,
  isIncompleteReply,
  completeReplyAPI,
  reliableChatAPI,
  timeLabel,
  generateId,
  nowMs,
  CURRENT_MEETING_KEY,
  MEETING_HISTORY_KEY,
  DEFAULT_MODELS_KEY,
  LANGUAGE_KEY,
  MAX_LOCAL_STORAGE_CHARS,
  safeGet,
  safeSet,
  loadUser,
  loadWallet,
  loadUsage,
  loadDisabledModels,
  loadMeetingHistory,
  saveMeetingHistory,
  meetingMarkdown,
  slugify,
  DEFAULT_MODEL_IDS,
  AUTH_USER_KEY,
  WALLET_KEY,
  USAGE_KEY,
  DISABLED_MODELS_KEY,
  CHAT_SESSIONS_KEY,
  ACTIVE_CHAT_KEY,
  normalizeMeetingModels,
  normalizeChatModels,
  parseCustomOptions,
  voteOptionsForType,
  loadDefaultModels,
  chatTitle,
  normalizeChatSession,
  newChatSession,
  loadChatSessions,
  loadInitialMeeting,
  loadInitialRoute,
  routePath,
  historyPageFromURL,
  downloadMarkdown,
  formatFileSize,
  isTextAttachment,
};
