import PollCard from "./components/PollCard.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import SummaryCard from "./components/SummaryCard.jsx";
import { runDiscussion, summaryMessages } from "./lib/discussion.js";
import * as React from "react";
import * as JSXRuntime from "react/jsx-runtime";
import {
  DEFAULT_MODELS,
  COMING_SOON_MODELS,
  MODEL_PREVIEW_COUNT,
  MODEL_EXPANDED_COUNT,
  normalizeRuntimeModels,
} from "./config/models.js";
import {
  autoRoundLimit,
  setAutoRoundLimit,
  hasRepeatedArguments,
  discussionMood,
  resetPersonas,
  MODEL_PERSONAS,
} from "./config/personas.js";
import { TRANSLATIONS } from "./i18n/translations.js";
import {
  getInitialLang,
  classifyError,
  authToken,
  setAuthToken,
  callAPI,
  callVoteAPI,
  callSummaryAPI,
  signupAPI,
  loginAPI,
  requestPasswordResetAPI,
  logoutAPI,
  meAPI,
  walletAPI,
  addDemoCreditsAPI,
  saveProviderAPI,
  deleteProviderAPI,
  testProviderAPI,
  syncProviderModelsAPI,
  modelsAPI,
  saveModelAPI,
  deleteModelAPI,
  adminRegistryAPI,
  DISCUSSION_CATEGORIES,
  classifyDiscussionCategory,
  discussionTypeLabel,
  analyzeVotesForStats,
  listDiscussionsAPI,
  upvoteDiscussionAPI,
  publishDiscussionAPI,
  getDiscussionAPI,
  statsAPI,
  chatAPI,
  reliableChatAPI,
  timeLabel,
  generateId,
  nowMs,
  CURRENT_MEETING_KEY,
  MEETING_HISTORY_KEY,
  DEFAULT_MODELS_KEY,
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
  newChatSession,
  loadChatSessions,
  loadInitialMeeting,
  loadInitialRoute,
  routePath,
  historyPageFromURL,
  downloadMarkdown,
  formatFileSize,
  isTextAttachment,
} from "./lib/app-support.js";
import "./styles/app.css";
export default function App() {
  let [initialMeeting] = React.useState(loadInitialMeeting),
    [initialRoute] = React.useState(loadInitialRoute),
    [lang, setLang] = React.useState(getInitialLang),
    [phase, setPhase] = React.useState(initialMeeting.phase),
    [topic, setTopic] = React.useState(initialMeeting.topic),
    [selected, setSelected] = React.useState(initialMeeting.selected),
    [mode, setMode] = React.useState(initialMeeting.mode),
    [answerType, setAnswerType] = React.useState(initialMeeting.answerType),
    [customOptionsText, setCustomOptionsText] = React.useState(
      initialMeeting.customOptionsText,
    ),
    [msgs, setMsgs] = React.useState(initialMeeting.msgs),
    [input, setInput] = React.useState(``),
    [busy, setBusy] = React.useState(false),
    [typingModel, setTypingModel] = React.useState(null),
    [votes, setVotes] = React.useState(initialMeeting.votes),
    [round1Votes, setRound1Votes] = React.useState(
      initialMeeting.round1Votes || [],
    ),
    [summary, setSummary] = React.useState(initialMeeting.summary),
    [error, setError] = React.useState(null),
    [restored, setRestored] = React.useState(initialMeeting.restored),
    [meetingHistory, setMeetingHistory] = React.useState(loadMeetingHistory),
    [sessionId, setSessionId] = React.useState(initialMeeting.sessionId),
    [publishedId, setPublishedId] = React.useState(null),
    [privateId, setPrivateId] = React.useState(null),
    [publishing, setPublishing] = React.useState(false),
    [publishStatus, setPublishStatus] = React.useState(null),
    [defaultsSaved, setDefaultsSaved] = React.useState(false),
    [mobileTab, setMobileTab] = React.useState(`room`),
    [navOpen, setNavOpen] = React.useState(false),
    [modelsExpanded, setModelsExpanded] = React.useState(false),
    [modelPickerOpen, setModelPickerOpen] = React.useState(false),
    [modelSearch, setModelSearch] = React.useState(``),
    [runtimeModels, setRuntimeModels] = React.useState([]),
    [menuOpen, setMenuOpen] = React.useState(false),
    [route, setRoute] = React.useState(initialRoute.route),
    [detailId, setDetailId] = React.useState(initialRoute.detailId),
    [authUser, setAuthUser] = React.useState(loadUser),
    [wallet, setWallet] = React.useState(loadWallet),
    [usageEvents, setUsageEvents] = React.useState(loadUsage),
    [authEmail, setAuthEmail] = React.useState(``),
    [authPassword, setAuthPassword] = React.useState(``),
    [authMessage, setAuthMessage] = React.useState(null),
    [authBusy, setAuthBusy] = React.useState(false),
    [adminProviders, setAdminProviders] = React.useState([]),
    [adminModels, setAdminModels] = React.useState([]),
    [adminLoading, setAdminLoading] = React.useState(false),
    [adminError, setAdminError] = React.useState(null),
    [providerForm, setProviderForm] = React.useState(null),
    [modelForm, setModelForm] = React.useState(null),
    [providerTests, setProviderTests] = React.useState({}),
    [adminTab, setAdminTab] = React.useState("providers"),
    [auditEvents, setAuditEvents] = React.useState([]),
    [adUQ, sadUQ] = React.useState(``),
    [adBan, sadBan] = React.useState([]),
    [adBal, sadBal] = React.useState(null),
    [adBalV, sadBalV] = React.useState(``),
    [cfgBYOK, sCfgBYOK] = React.useState(true),
    [cfgVote, sCfgVote] = React.useState(true),
    [cfgStats, sCfgStats] = React.useState(true),
    [cfgReg, sCfgReg] = React.useState(true),
    [cfgMaxMeet, sCfgMaxMeet] = React.useState(50),
    [cfgMaxRnd, sCfgMaxRnd] = React.useState(20),
    [cfgMaxMod, sCfgMaxMod] = React.useState(6),
    [anncText, sAnncText] = React.useState(``),
    [anncTarget, sAnncTarget] = React.useState(`all`),
    [anncType, sAnncType] = React.useState(`banner`),
    [anncFrom, sAnncFrom] = React.useState(``),
    [anncTo, sAnncTo] = React.useState(``),
    [inviteCodes, sInviteCodes] = React.useState([]),
    [auSrch, sAuSrch] = React.useState(``),
    [auUser, sAuUser] = React.useState(``),
    [auModel, sAuModel] = React.useState(``),
    [auDate, sAuDate] = React.useState(``),
    [disabledModels, setDisabledModels] = React.useState(loadDisabledModels),
    creditBalance = wallet.balance || 0,
    [publicDiscussions, setPublicDiscussions] = React.useState([]),
    [historyLoading, setHistoryLoading] = React.useState(false),
    [historyError, setHistoryError] = React.useState(null),
    [historySort, setHistorySort] = React.useState(`hot`),
    [historySearch, setHistorySearch] = React.useState(``),
    [historyCategory, setHistoryCategory] = React.useState(``),
    [historyMode, setHistoryMode] = React.useState(``),
    [historyAnswerType, setHistoryAnswerType] = React.useState(``),
    [historyPage, setHistoryPage] = React.useState(historyPageFromURL),
    [historyTotal, setHistoryTotal] = React.useState(0),
    [historyPages, setHistoryPages] = React.useState(1),
    [historyCategories, setHistoryCategories] = React.useState([]),
    [discussionDetail, setDiscussionDetail] = React.useState(null),
    [detailLoading, setDetailLoading] = React.useState(false),
    [detailError, setDetailError] = React.useState(null),
    [voteStage, setVoteStage] = React.useState(`after`),
    [detailAnswers, setDetailAnswers] = React.useState([]),
    [copiedLink, setCopiedLink] = React.useState(false),
    [answerStyle, setAnswerStyle] = React.useState(`plain`),
    [sidebarOpen, setSidebarOpen] = React.useState(true),
    [__wc, __setWc] = React.useState(false),
    [stats, setStats] = React.useState(null),
    [statsLoading, setStatsLoading] = React.useState(false),
    [statsError, setStatsError] = React.useState(null),
    [statsWindow, setStatsWindow] = React.useState(`all`),
    [chatSessions, setChatSessions] = React.useState(loadChatSessions),
    [activeChatId, setActiveChatId] = React.useState(() => {
      let e = safeGet(ACTIVE_CHAT_KEY);
      return (
        chatSessions.find((t) => t.id === e)?.id ||
        chatSessions[0]?.id ||
        generateId()
      );
    }),
    activeChat =
      chatSessions.find((e) => e.id === activeChatId) ||
      chatSessions[0] ||
      newChatSession(),
    [chatMessages, setChatMessages] = React.useState(activeChat.msgs || []),
    [chatInput, setChatInput] = React.useState(``),
    [chatBusy, setChatBusy] = React.useState(false),
    [chatMode, setChatMode] = React.useState(activeChat.mode || `roundtable`),
    [chatModels, setChatModels] = React.useState(
      normalizeChatModels(activeChat.models) || DEFAULT_MODEL_IDS,
    ),
    [chatModelsOpen, setChatModelsOpen] = React.useState(false),
    [_sh, _setSH] = React.useState(false),
    [chatPickerOpen, setChatPickerOpen] = React.useState(false),
    [chatModelSearch, setChatModelSearch] = React.useState(``),
    [discussionMode, setDiscussionMode] = React.useState(`independent`),
    [modeMenuOpen, setModeMenuOpen] = React.useState(false),
    [chatVoteOptions, setChatVoteOptions] = React.useState([``, ``]),
    [draggedModel, setDraggedModel] = React.useState(null),
    [attachments, setAttachments] = React.useState([]),
    [pendingLaunch, setPendingLaunch] = React.useState(null),
    chatEndRef = React.useRef(null),
    fileInputRef = React.useRef(null),
    chatActionsRef = React.useRef({
      chatSend: null,
      runChatVoteInChat: null,
    }),
    activeConversationRef = React.useRef(activeChatId),
    modelCatalog = runtimeModels;
  activeConversationRef.current = activeChatId;
  const discussionAbortRef = React.useRef(null);
  const chatMessagesRef = React.useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const stopDiscussion = () => {
    discussionAbortRef.current?.abort();
    discussionAbortRef.current = null;
    setChatBusy(false);
    setChatMessages((previous) =>
      previous.map((m) => ({
        ...m,
        streaming: false,
        summaryLoading: false,
        loading: false,
        pendingModelIds: [],
      })),
    );
  };
  React.useEffect(
    () => () => {
      discussionAbortRef.current?.abort();
      discussionAbortRef.current = null;
    },
    [activeChatId, route],
  );
  React.useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title =
      "ChatOOP AI Roundtable · " +
      (lang === "zh" ? "多模型 AI 圆桌" : "Multi-model AI discussions");
  }, [lang]);
  (React.useEffect(() => {
    route === `chat` &&
      chatEndRef.current?.scrollIntoView({
        behavior: `smooth`,
        block: `end`,
      });
  }, [chatMessages, route]),
    React.useEffect(() => {
      safeSet(ACTIVE_CHAT_KEY, activeChatId);
    }, [activeChatId]),
    React.useEffect(() => {
      safeSet(CHAT_SESSIONS_KEY, chatSessions);
    }, [chatSessions]),
    React.useEffect(() => {
      setChatSessions((e) => {
        let t = Date.now(),
          n = chatTitle(chatMessages);
        return e
          .map((e) =>
            e.id === activeChatId
              ? {
                  ...e,
                  title: n || e.title,
                  msgs: chatMessages,
                  mode: chatMode,
                  models:
                    normalizeChatModels(chatModels) ||
                    e.models ||
                    DEFAULT_MODEL_IDS,
                  updatedAt: chatMessages.length ? t : e.updatedAt,
                }
              : e,
          )
          .sort((e, t) => t.updatedAt - e.updatedAt)
          .slice(0, 20);
      });
    }, [activeChatId, chatMessages, chatMode, chatModels]),
    React.useEffect(() => {
      let e = () => {
        let e = loadInitialRoute();
        (setRoute(e.route),
          setDetailId(e.detailId),
          e.route === `history` && setHistoryPage(historyPageFromURL()),
          setMenuOpen(false));
      };
      return (
        window.addEventListener(`popstate`, e),
        () => window.removeEventListener(`popstate`, e)
      );
    }, []),
    React.useEffect(() => {
      let e = false;
      return (
        modelsAPI()
          .then((t) => {
            let n = normalizeRuntimeModels(t.models);
            !e && setRuntimeModels(n);
          })
          .catch(() => {}),
        () => {
          e = true;
        }
      );
    }, []),
    React.useEffect(() => {
      if (!modelPickerOpen) return;
      let e = false;
      (modelsAPI()
        .then((t) => {
          let n = normalizeRuntimeModels(t.models);
          !e && setRuntimeModels(n);
        })
        .catch(() => {}),
        () => {
          e = true;
        });
    }, [modelPickerOpen]),
    React.useEffect(() => {
      if (route !== `history`) return;
      let e = false;
      (setHistoryLoading(true), setHistoryError(null));
      let t = setTimeout(
        () => {
          listDiscussionsAPI({
            sort: historySort,
            category: historySearch,
            mode: historyCategory,
            lang: historyMode,
            q: historyAnswerType,
            page: historyPage,
            pageSize: 50,
          })
            .then((t) => {
              e ||
                (setPublicDiscussions(t.items || []),
                setHistoryTotal(t.total || 0),
                setHistoryPages(t.pages || 1),
                t.categories && setHistoryCategories(t.categories));
            })
            .catch((t) => {
              e || setHistoryError(t);
            })
            .finally(() => {
              e || setHistoryLoading(false);
            });
        },
        historyAnswerType ? 280 : 0,
      );
      return () => {
        ((e = true), clearTimeout(t));
      };
    }, [
      route,
      historySort,
      historySearch,
      historyCategory,
      historyMode,
      historyAnswerType,
      historyPage,
    ]),
    React.useEffect(() => {
      if (route !== `question` || !detailId) return;
      let e = false;
      return (
        setDetailLoading(true),
        setDetailError(null),
        setDiscussionDetail(null),
        setVoteStage(`after`),
        setDetailAnswers([]),
        getDiscussionAPI(detailId)
          .then((t) => {
            e || setDiscussionDetail(t);
          })
          .catch((t) => {
            e || setDetailError(t);
          })
          .finally(() => {
            e || setDetailLoading(false);
          }),
        listDiscussionsAPI({
          sort: `hot`,
          page: 1,
          pageSize: 5,
        })
          .then((t) => {
            e ||
              setDetailAnswers(
                (t.items || []).filter((e) => e.id !== detailId).slice(0, 3),
              );
          })
          .catch(() => {
            e || setDetailAnswers([]);
          }),
        () => {
          e = true;
        }
      );
    }, [route, detailId]),
    React.useEffect(() => {
      if (route !== `question` || !discussionDetail?.question) return;
      let e = `${discussionDetail.question} — AI Roundtable`;
      document.title = e;
      let t = String(
          discussionDetail.summary || discussionDetail.question || ``,
        ).slice(0, 160),
        n = (e, t) => {
          let n = document.head.querySelector(e);
          (n ||
            ((n = document.createElement(`meta`)),
            Object.entries(t.seed || {}).forEach(([e, t]) =>
              n.setAttribute(e, t),
            ),
            document.head.appendChild(n)),
            Object.entries(t.set || {}).forEach(([e, t]) =>
              n.setAttribute(e, t),
            ));
        };
      (n(`meta[property="og:title"]`, {
        seed: {
          property: `og:title`,
        },
        set: {
          content: e,
        },
      }),
        n(`meta[property="og:description"]`, {
          seed: {
            property: `og:description`,
          },
          set: {
            content: t,
          },
        }),
        n(`meta[name="twitter:title"]`, {
          seed: {
            name: `twitter:title`,
          },
          set: {
            content: e,
          },
        }),
        n(`meta[name="twitter:description"]`, {
          seed: {
            name: `twitter:description`,
          },
          set: {
            content: t,
          },
        }));
    }, [route, discussionDetail]),
    React.useEffect(() => {
      if (route !== `stats`) return;
      let e = false;
      return (
        setStatsLoading(true),
        setStatsError(null),
        statsAPI(statsWindow)
          .then((t) => {
            e || setStats(t);
          })
          .catch((t) => {
            e || setStatsError(t);
          })
          .finally(() => {
            e || setStatsLoading(false);
          }),
        () => {
          e = true;
        }
      );
    }, [route, statsWindow]));
  let meetingEndRef = React.useRef(null),
    meetingInputRef = React.useRef(null),
    translate = (e, t) => {
      let r =
        (TRANSLATIONS[lang] && TRANSLATIONS[lang][e]) ??
        TRANSLATIONS.en[e] ??
        e;
      if (t) for (let e of Object.keys(t)) r = r.split(`{${e}}`).join(t[e]);
      return r;
    };
  (React.useEffect(() => {
    document.documentElement.lang = lang === `zh` ? `zh-CN` : `en`;
    try {
      localStorage.setItem(`chatoop_rt_lang`, lang);
    } catch {}
  }, [lang]),
    React.useEffect(() => {
      if (authUser) safeSet(AUTH_USER_KEY, authUser);
      else
        try {
          localStorage.removeItem(AUTH_USER_KEY);
        } catch {}
    }, [authUser]),
    React.useEffect(() => {
      safeSet(WALLET_KEY, wallet);
    }, [wallet]),
    React.useEffect(() => {
      authToken() &&
        (meAPI()
          .then((e) => {
            e &&
              e.user &&
              (setAuthUser(e.user),
              typeof e.user.credits == `number` &&
                setWallet((t) => ({
                  ...t,
                  balance: e.user.credits,
                })));
          })
          .catch(() => {}),
        walletAPI()
          .then((e) => {
            (e?.wallet && setWallet(e.wallet),
              Array.isArray(e?.usage) && setUsageEvents(e.usage));
          })
          .catch(() => {}));
    }, []),
    React.useEffect(() => {
      if (route !== `admin` || authUser?.role !== `admin`) return;
      let e = false;
      return (
        setAdminLoading(true),
        setAdminError(null),
        adminRegistryAPI()
          .then((t) => {
            e ||
              (setAdminProviders(t.providers),
              setAdminModels(t.models),
              t.error && setAdminFailure(t.error));
          })
          .catch((t) => {
            e || setAdminFailure(t);
          })
          .finally(() => {
            e || setAdminLoading(false);
          }),
        () => {
          e = true;
        }
      );
    }, [route, authUser]),
    React.useEffect(() => {
      safeSet(USAGE_KEY, usageEvents);
    }, [usageEvents]),
    React.useEffect(() => {
      safeSet(DISABLED_MODELS_KEY, disabledModels);
    }, [disabledModels]),
    React.useEffect(() => {
      let e = new Set(disabledModels),
        t = modelCatalog.map((e) => e.id).filter((t) => !e.has(t)),
        n = DEFAULT_MODEL_IDS.filter((e) => t.includes(e)),
        r = t.filter((e) => !n.includes(e)),
        i = [...n, ...r].slice(0, 6);
      (setSelected((n) => {
        let r = n.filter((n) => t.includes(n) && !e.has(n));
        return r.length >= 2 ? r : i.slice(0, Math.max(2, i.length));
      }),
        setChatModels((n) => {
          let r = n.filter((n) => t.includes(n) && !e.has(n));
          return r.length ? r : i.slice(0, Math.min(4, i.length));
        }));
    }, [disabledModels, modelCatalog]),
    React.useEffect(() => {
      let e = document.createElement(`link`);
      ((e.rel = `stylesheet`),
        (e.href = `https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300;1,9..144,700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`),
        document.head.appendChild(e));
    }, []),
    React.useEffect(() => {
      if (phase === `setup`) return;
      let e = {
        id: sessionId || generateId(),
        topic: topic,
        mode: mode,
        answerType: answerType,
        customOptionsText: customOptionsText,
        models: selected,
        msgs: msgs,
        votes: votes,
        round1Votes: round1Votes,
        summary: summary,
        phase: phase,
        updatedAt: nowMs(),
      };
      JSON.stringify(e).length <= MAX_LOCAL_STORAGE_CHARS &&
        safeSet(CURRENT_MEETING_KEY, e);
    }, [
      phase,
      msgs,
      votes,
      round1Votes,
      summary,
      topic,
      mode,
      answerType,
      customOptionsText,
      selected,
      sessionId,
    ]),
    React.useEffect(() => {
      meetingEndRef.current?.scrollIntoView({
        behavior: `smooth`,
      });
    }, [msgs, votes, busy, typingModel]));
  let getModel = (e) => modelCatalog.find((t) => t.id === e),
    isModelDisabled = (e) => disabledModels.includes(e),
    enabledModelIds = () =>
      modelCatalog.map((e) => e.id).filter((e) => !isModelDisabled(e)),
    preferredModelIds = () => {
      let e = enabledModelIds(),
        t = DEFAULT_MODEL_IDS.filter((t) => e.includes(t)),
        n = e.filter((e) => !t.includes(e));
      return [...t, ...n].slice(0, 6);
    },
    selectedModels = () =>
      selected
        .map((e) => getModel(e))
        .filter((e) => e && !isModelDisabled(e.id)),
    activeModels = selectedModels,
    inferVoteFromText = (e, t, n = 0) => {
      let r = String(e || ``).trim(),
        i = r.toLowerCase();
      if (t.length) {
        let e =
          r.match(/^(?:option\s*)?([A-F])(?:\b|[\s:\uFF1A.)\]-])/i) ||
          r.match(/[[({\uFF08\u3010]\s*([A-F])\s*[:\uFF1A.)\]}\uFF09\u3011]/i);
        if (e) {
          let n = e[1].toUpperCase().charCodeAt(0) - 65;
          if (n >= 0 && n < t.length) return t[n];
        }
        return (
          t.find((e) => i.includes(String(e).toLowerCase())) || t[n % t.length]
        );
      }
      return /\b(no|against|oppose|not worth|don't|do not|avoid)\b|\u4e0d|\u53cd\u5bf9|\u4e0d\u503c\u5f97|\u4e0d\u8981/.test(
        i,
      )
        ? `NO`
        : /\b(yes|support|agree|worth|should|recommend)\b|\u8d5e\u6210|\u503c\u5f97|\u5e94\u8be5|\u53ef\u4ee5/.test(
              i,
            ) || n % 2 == 0
          ? `YES`
          : `NO`;
    },
    captureRound1Votes = (e) => {
      let t = (e || [])
        .filter((e) => e.type === `model` && (Number(e.round) || 1) === 1)
        .map((e, t) => ({
          modelId: e.modelId,
          modelName: e.modelName,
          vote: inferVoteFromText(e.content, voteOptions, t),
          reason: `Captured after the first independent answer.`,
        }));
      return (setRound1Votes(t), t);
    },
    usageAmount = (e = 1, t = 0.02) => Number((Math.max(0, e) * t).toFixed(4)),
    hasCredits = () => true,
    creditError = (e) => ({
      code: `credits`,
      text: translate(`err_insufficientCredits`, {
        amount: e.toFixed(4),
      }),
      detail: ``,
      retryAction: null,
    }),
    ensureCredits = (e) =>
      hasCredits(e) ? true : (setError(creditError(e)), false),
    recordUsage = (label, modelCount = 1) => {
      const event = {
        id: generateId(),
        label,
        modelCount,
        amount: 0,
        at: Date.now(),
      };
      setUsageEvents((previous) => [event, ...previous].slice(0, 100));
    },
    toggleModel = (e) => {
      isModelDisabled(e) ||
        setSelected((t) =>
          t.includes(e)
            ? t.length > 2
              ? t.filter((t) => t !== e)
              : t
            : t.length < 6
              ? [...t, e]
              : t,
        );
    },
    moveSelectedModel = (e, t) => {
      setSelected((n) => {
        let r = n.indexOf(e),
          i = r + t;
        if (r < 0 || i < 0 || i >= n.length) return n;
        let a = [...n];
        return (([a[r], a[i]] = [a[i], a[r]]), a);
      });
    },
    removeSelectedModel = (e) => {
      setSelected((t) => (t.length > 2 ? t.filter((t) => t !== e) : t));
    },
    restoreDefaultModels = () => setSelected(loadDefaultModels()),
    saveDefaultModels = () => {
      (safeSet(DEFAULT_MODELS_KEY, selected),
        setDefaultsSaved(true),
        setTimeout(() => setDefaultsSaved(false), 1600));
    },
    toError = (e, t = {}) => {
      let n = e?.code || classifyError(e?.message),
        r;
      return (
        (r =
          n === `config`
            ? translate(`err_config`)
            : n === `model`
              ? translate(`err_model`, {
                  model: t.model || `Model`,
                })
              : translate(
                  n === `network`
                    ? `err_network`
                    : n === `rate`
                      ? `err_rate`
                      : n === `origin`
                        ? `err_origin`
                        : n === `validation`
                          ? `err_validation`
                          : n === `upstream`
                            ? `err_upstream`
                            : `err_generic`,
                )),
        t.prefix && (r = `${t.prefix} ${r}`),
        {
          code: n,
          text: r,
          detail: e?.detail || e?.message || ``,
          retryAction: t.action || null,
        }
      );
    },
    toggleLanguage = () => setLang((e) => (e === `zh` ? `en` : `zh`)),
    startMeeting = () => {
      let e = activeModels();
      if (!topic.trim() || e.length < 2) return;
      let t = topic.trim(),
        n = e.map((e) => e.id),
        r = voteOptionsForType(answerType, customOptionsText),
        i = newChatSession({
          mode: `roundtable`,
          models: n,
        });
      (setChatSessions((e) => [i, ...e].slice(0, 20)),
        setActiveChatId(i.id),
        setChatMessages([]),
        setChatMode(`roundtable`),
        setChatModels(n),
        setAttachments([]),
        setPendingLaunch({
          topic: t,
          mode: mode,
          answerType: answerType,
          options: r,
          models: n,
        }),
        navigate(`chat`));
    },
    continueNextRound = async () => {
      let __myConvId = sessionId;
      let e = activeModels(),
        t = usageAmount(e.length, 0.02);
      if (
        busy ||
        phase !== `meeting` ||
        e.length < 2 ||
        !topic.trim() ||
        !ensureCredits(t)
      )
        return;
      if (activeConversationRef.current !== __myConvId) return;
      (setError(null), setBusy(true));
      let n =
          Math.max(
            0,
            ...msgs
              .filter((e) => e.type === `model`)
              .map((e) => Number(e.round) || 1),
          ) + 1,
        r = [
          ...msgs,
          {
            type: `system`,
            key: `phase_followup`,
            time: timeLabel(),
          },
        ];
      setMsgs([...r]);
      let a = () =>
        r
          .filter((e) => e.type !== `system`)
          .map((e) =>
            e.type === `host`
              ? `[TOPIC]: ${e.content}`
              : e.type === `model`
                ? `[${e.modelName}]: ${e.content}`
                : `[HOST]: ${e.content}`,
          ).join(`

`);
      for (let e of [...activeModels()].sort(() => Math.random() - 0.5)) {
        setTypingModel(e.id);
        let t =
          `Topic: "${topic}"\n\nTranscript so far:\n${a()}\n\nRound ${n}. Respond to the single MOST compelling point so far (whoever made it); don't recap everyone. If you're first with nothing to answer yet, briefly state your opening view. Say your reaction directly, no preamble. If an argument genuinely convinced you, say so and name which one; otherwise hold your view and say why. Let length follow your mood: short and sharp when provoked, a little longer when you've thought it through, a one-liner is fine, don't pad. Add at least one new thing (an example, a number, a counterexample, or an overlooked premise); don't repeat your last turn. Do not open with "I agree" / "I disagree" / "on one hand" / "in conclusion" — open like "Actually I'd argue the opposite—" or "Hold on, the real issue isn't that." or "That point won me over, but—" or "We're stuck on the same thing." If the conversation is in Chinese, open like 「其实我正相反——」「等一下，真正的问题不在这。」「这条把我说服了，但——」「我们其实卡在同一处。」 You don't have to conclude every round.` +
          discussionMood(e.name, a());
        try {
          let i = await callAPI(e.id, MODEL_PERSONAS[e.id], t),
            a = {
              type: `model`,
              modelId: e.id,
              modelName: e.name,
              color: e.color,
              symbol: e.symbol,
              content: i.reply,
              time: timeLabel(),
              round: n,
              phase: `followup`,
              confidence: null,
              modelUsed: i.modelUsed,
              fallbackUsed: i.fallbackUsed,
            };
          r = [...r, a];
          if (activeConversationRef.current === __myConvId) setMsgs([...r]);
        } catch (t) {
          setError(
            toError(t, {
              model: e.name,
              action: `next`,
            }),
          );
        }
      }
      (setTypingModel(null),
        recordUsage(`next round`, e.length, 0.02),
        setBusy(false));
      if (
        discussionMode === `debate_auto` &&
        activeConversationRef.current === __myConvId
      ) {
        if (
          n < autoRoundLimit &&
          !(n >= autoRoundLimit && hasRepeatedArguments(r))
        ) {
          setTimeout(function () {
            continueNextRound();
          }, 1100);
        } else {
          setTimeout(function () {
            try {
              summarizeMeeting();
            } catch (_e) {}
          }, 400);
        }
      }
    },
    sendMeetingMessage = async (e) => {
      let t = (e ?? input).trim();
      if (!t || busy) return;
      if ((setInput(``), setError(null), t === `/vote`)) {
        runVote();
        return;
      }
      if (t === `/summary`) {
        summarizeMeeting();
        return;
      }
      if (t === `/export`) {
        exportMeeting();
        return;
      }
      if (t === `/next`) {
        continueNextRound();
        return;
      }
      if (t === `/new`) {
        resetMeeting();
        return;
      }
      let n = {
          type: `user`,
          content: t,
          time: timeLabel(),
        },
        r = [...msgs, n];
      (setMsgs([...r]), setBusy(true));
      let i = activeModels(),
        a = t.match(/^@(\w+)/i),
        s = null;
      if (a) {
        let e = a[1].toLowerCase();
        if (e === `all`) i = activeModels();
        else {
          let t = modelCatalog.find(
            (t) =>
              t.id.startsWith(e) ||
              t.name.toLowerCase().replace(/\s/g, ``).startsWith(e),
          );
          t && selected.includes(t.id) && !isModelDisabled(t.id)
            ? (i = [t])
            : (s = a[1]);
        }
      }
      if (s) {
        (setError({
          code: `generic`,
          text: `@${s} ✗`,
          detail: ``,
          retryAction: null,
        }),
          setBusy(false));
        return;
      }
      if (!ensureCredits(usageAmount(i.length, 0.015))) {
        setBusy(false);
        return;
      }
      let l = msgs
        .filter((e) => e.type === `model`)
        .map((e) => `[${e.modelName}]: ${e.content}`).join(`

`);
      for (let e of i) {
        setTypingModel(e.id);
        let n = `Topic: "${topic}"\n\nDiscussion:\n${l}\n\nNew question: "${t}"\n\nRespond directly and concisely.`;
        try {
          let t = await callAPI(e.id, MODEL_PERSONAS[e.id], n),
            i = {
              type: `model`,
              modelId: e.id,
              modelName: e.name,
              color: e.color,
              symbol: e.symbol,
              content: t.reply,
              time: timeLabel(),
              modelUsed: t.modelUsed,
              fallbackUsed: t.fallbackUsed,
            };
          ((r = [...r, i]), setMsgs([...r]));
        } catch (n) {
          setError(
            toError(n, {
              model: e.name,
              action: `send:${t}`,
            }),
          );
        }
      }
      (setTypingModel(null),
        recordUsage(`follow-up`, i.length, 0.015),
        setBusy(false));
      if (discussionMode === `debate_auto`)
        setTimeout(function () {
          continueNextRound();
        }, 900);
    },
    runVote = async () => {
      let e = activeModels();
      if (!ensureCredits(usageAmount(e.length, 0.01))) return;
      (setBusy(true), setVotes([]), setPhase(`voting`), setError(null));
      let t = msgs
        .filter((e) => e.type === `model`)
        .map((e) => `[${e.modelName}]: ${e.content}`).join(`

`);
      setTypingModel(e[0]?.id || null);
      try {
        let r = round1Votes.length ? round1Votes : captureRound1Votes(msgs);
        setVotes(
          analyzeVotesForStats(
            (
              await callVoteAPI(
                topic,
                e.map((e) => e.id),
                t,
                voteOptions,
                r,
                lang,
              )
            ).map((e) => {
              let t = getModel(e.modelId);
              return {
                ...e,
                color: t?.color || `#8888AA`,
                symbol: t?.symbol || `AI`,
              };
            }),
          ).votes,
        );
      } catch (e) {
        setError(
          toError(e, {
            prefix: translate(`err_voteFailed`),
            action: `vote`,
          }),
        );
      }
      (setTypingModel(null),
        recordUsage(`vote`, e.length, 0.01),
        setBusy(false));
    },
    summarizeMeeting = async () => {
      if (!ensureCredits(usageAmount(1, 0.02))) return;
      (setBusy(true), setError(null));
      let e = msgs
        .filter((e) => e.type !== `system`)
        .map((e) =>
          e.type === `host`
            ? `[TOPIC]: ${e.content}`
            : e.type === `model`
              ? `[${e.modelName}]: ${e.content}`
              : `[HOST]: ${e.content}`,
        ).join(`

`);
      try {
        (setSummary(await callSummaryAPI(topic, e, votes)),
          setPhase(`summary`));
      } catch (e) {
        setError(
          toError(e, {
            prefix: translate(`err_summaryFailed`),
            action: `summary`,
          }),
        );
      }
      (recordUsage(`summary`, 1, 0.02), setBusy(false));
    },
    exportMeeting = () => {
      let e = meetingMarkdown(translate, {
        topic: topic,
        mode: mode,
        msgs: msgs,
        votes: votes,
        summary: summary,
      });
      downloadMarkdown(
        `roundtable-${new Date().toISOString().slice(0, 10)}-${slugify(topic)}.md`,
        e,
      );
    },
    exportHistoryMeeting = (e) => {
      let t = meetingMarkdown(translate, {
        topic: e.topic || ``,
        mode: e.mode || `discussion`,
        msgs: e.msgs || [],
        votes: e.votes || [],
        summary: e.summary || ``,
      });
      downloadMarkdown(
        `roundtable-${new Date().toISOString().slice(0, 10)}-${slugify(e.topic)}.md`,
        t,
      );
    },
    archiveMeeting = () => {
      msgs.length > 1 &&
        (saveMeetingHistory({
          id: sessionId || generateId(),
          topic: topic,
          mode: mode,
          answerType: answerType,
          customOptionsText: customOptionsText,
          models: selected,
          msgs: msgs,
          votes: votes,
          round1Votes: round1Votes,
          summary: summary,
          phase: phase,
          updatedAt: nowMs(),
        }),
        setMeetingHistory(loadMeetingHistory()));
    },
    currentPublishId = () => sessionId || `local`,
    publishMeeting = async () => {
      if (!topic.trim() || msgs.length < 2 || busy || typingModel) return;
      let e = currentPublishId();
      if (publishedId === e) return;
      (setPublishing(true), setPublishStatus(null));
      let t = analyzeVotesForStats(votes),
        r = await publishDiscussionAPI({
          question: topic,
          mode: mode === `vote` ? `vote` : `debate`,
          answerType: answerType,
          category: classifyDiscussionCategory(
            topic,
            `${summary} ${msgs.map((e) => e.content || ``).join(` `)}`,
          ),
          lang: lang,
          modelNames: activeModels().map((e) => e.name),
          transcript: msgs
            .filter((e) => e.type !== `system`)
            .map((e) => ({
              role: e.type,
              modelName: e.modelName,
              content: e.content,
              round: e.round,
              phase: e.phase,
            })),
          votes: t.votes,
          voteStats: t.voteStats,
          summary: summary,
        });
      (setPublishing(false),
        r
          ? (setPublishedId(e), setPrivateId(null))
          : setPublishStatus(translate(`publishFailed`)));
    },
    keepMeetingPrivate = () => {
      (setPrivateId(currentPublishId()), setPublishStatus(null));
    },
    resetMeeting = () => {
      resetPersonas();
      archiveMeeting();
      try {
        localStorage.removeItem(CURRENT_MEETING_KEY);
      } catch {}
      (setPhase(`setup`),
        setMsgs([]),
        setVotes([]),
        setRound1Votes([]),
        setSummary(``),
        setTopic(``),
        setAnswerType(`yesno`),
        setCustomOptionsText(``),
        setSessionId(null),
        setPublishedId(null),
        setPrivateId(null),
        setPublishing(false),
        setPublishStatus(null),
        setRestored(false),
        setError(null));
    },
    restoreMeeting = (e) => {
      (setTopic(e.topic || ``),
        setSelected(
          e.models?.length ? e.models : [`gpt4o`, `claude`, `deepseek`],
        ),
        setMode(e.mode || `discussion`),
        setAnswerType(e.answerType || (e.mode === `vote` ? `yesno` : `open`)),
        setCustomOptionsText(e.customOptionsText || ``),
        setMsgs(e.msgs || []),
        setVotes(e.votes || []),
        setRound1Votes(e.round1Votes || []),
        setSummary(e.summary || ``),
        setSessionId(e.id || generateId()),
        setPhase(e.phase && e.phase !== `setup` ? e.phase : `meeting`),
        setError(null));
    },
    clearMeetingHistory = () => {
      try {
        localStorage.removeItem(MEETING_HISTORY_KEY);
      } catch {}
      setMeetingHistory([]);
    },
    copyText = (e) => navigator.clipboard.writeText(e).catch(() => {}),
    retryLastAction = () => {
      let e = error?.retryAction;
      (setError(null),
        e &&
          (e === `start`
            ? startMeeting()
            : e === `next`
              ? continueNextRound()
              : e === `vote`
                ? runVote()
                : e === `summary`
                  ? summarizeMeeting()
                  : e.startsWith(`send:`) && sendMeetingMessage(e.slice(5))));
    },
    login = async () => {
      (setAuthMessage(null), setAuthBusy(true));
      try {
        let e = await loginAPI(authEmail.trim(), authPassword);
        (setAuthToken(e.token),
          setAuthUser(e.user),
          setWallet({
            balance: e.user.credits ?? 5,
            starting: e.user.startingCredits ?? 5,
            used: Math.max(
              0,
              (e.user.startingCredits || 5) - (e.user.credits ?? 5),
            ),
          }),
          navigate(e.user.role === `admin` ? `admin` : `dashboard`));
      } catch (e) {
        setAuthMessage(e.detail || e.message || translate(`authBadLogin`));
      } finally {
        setAuthBusy(false);
      }
    },
    signup = async () => {
      (setAuthMessage(null), setAuthBusy(true));
      try {
        let e = await signupAPI(
          authEmail.trim(),
          authPassword,
          authEmail.trim().split(`@`)[0],
        );
        (setAuthToken(e.token),
          setAuthUser(e.user),
          setWallet({
            balance: e.user.credits ?? 5,
            starting: e.user.startingCredits ?? 5,
            used: 0,
          }),
          navigate(e.user.role === `admin` ? `admin` : `dashboard`));
      } catch (e) {
        setAuthMessage(e.detail || e.message || translate(`err_generic`));
      } finally {
        setAuthBusy(false);
      }
    },
    requestPasswordReset = async () => {
      (setAuthMessage(null), setAuthBusy(true));
      try {
        (await requestPasswordResetAPI(authEmail.trim()),
          setAuthMessage(translate(`authResetSent`)));
      } catch (e) {
        setAuthMessage(e.detail || e.message || translate(`err_generic`));
      } finally {
        setAuthBusy(false);
      }
    },
    logout = () => {
      (logoutAPI(),
        setAuthToken(``),
        setAuthUser(null),
        setAuthMessage(null),
        navigate(`home`, newMeetingAction));
    },
    addDemoCredits = () => {
      (authToken() &&
        addDemoCreditsAPI()
          .then((e) => {
            (e?.wallet && setWallet(e.wallet), e?.user && setAuthUser(e.user));
          })
          .catch(() => {}),
        setWallet((e) => ({
          starting: Number(((e.starting || 0) + 5).toFixed(4)),
          used: e.used || 0,
          balance: Number(((e.balance || 0) + 5).toFixed(4)),
        })),
        setUsageEvents((e) =>
          [
            {
              id: `credit_${Date.now()}`,
              label: translate(`walletCreditAdded`),
              modelCount: 0,
              amount: -5,
              at: nowMs(),
              userId: authUser?.id || `guest`,
            },
            ...e,
          ].slice(0, 50),
        ));
    },
    resetDemoUsage = () => {
      let e = authUser?.role === `admin` ? 25 : 5;
      (setWallet({
        balance: e,
        starting: e,
        used: 0,
      }),
        setUsageEvents([]));
    },
    recordAudit = (e, t) => {
      setAuditEvents((n) =>
        [
          {
            id: `audit_${Date.now()}`,
            action: e,
            target: t,
            actor: authUser?.email || `admin`,
            at: nowMs(),
          },
          ...n,
        ].slice(0, 30),
      );
    },
    toggleDisabledModel = (e) => {
      let t = !isModelDisabled(e.id);
      if (
        (setDisabledModels((n) =>
          t ? [...new Set([...n, e.id])] : n.filter((t) => t !== e.id),
        ),
        t)
      ) {
        let t = preferredModelIds().filter((t) => t !== e.id);
        (setSelected((n) => {
          let r = n.filter((t) => t !== e.id && !isModelDisabled(t));
          return r.length >= 2 ? r : t.slice(0, Math.max(2, t.length));
        }),
          setChatModels((n) => {
            let r = n.filter((t) => t !== e.id && !isModelDisabled(t));
            return r.length ? r : t.slice(0, Math.min(4, t.length));
          }));
      }
      recordAudit(
        translate(t ? `adminDisableModel` : `adminEnableModel`),
        e.name,
      );
    },
    hideLocalHistory = (e) => {
      let t = meetingHistory.filter((t) => t.id !== e.id);
      (setMeetingHistory(t),
        safeSet(MEETING_HISTORY_KEY, t),
        recordAudit(translate(`adminHidePublic`), e.topic || e.id));
    },
    APP_STYLES = "",
    languageButton = (
      <button
        type={`button`}
        onClick={toggleLanguage}
        className={`rt-button rt-lang-button`}
      >
        {lang === `zh` ? `EN` : `中文`}
      </button>
    ),
    errorBanner = error && (
      <div className={`rt-error`}>
        <div
          style={{
            flex: 1,
          }}
        >
          <div>
            {`⚠ `}
            {error.text}
          </div>
          {error.detail && (
            <div className={`rt-error-detail`}>{error.detail}</div>
          )}
        </div>
        <div
          className={`rt-inline-actions`}
          style={{
            flexShrink: 0,
          }}
        >
          {error.retryAction && (
            <button
              type={`button`}
              onClick={retryLastAction}
              className={`rt-ghost-button`}
            >
              {translate(`retry`)}
            </button>
          )}
          <button
            type={`button`}
            onClick={() => setError(null)}
            className={`rt-ghost-button`}
          >
            {translate(`dismiss`)}
          </button>
        </div>
      </div>
    ),
    currentRound = Math.max(
      1,
      ...msgs
        .filter((e) => e.type === `model`)
        .map((e) => Number(e.round) || 1),
    ),
    yesVotes = votes.filter((e) => e.vote === `YES`).length,
    noVotes = votes.filter((e) => e.vote === `NO`).length,
    participantCount = activeModels().length,
    _coItems = (() => {
      let e = String(customOptionsText || ``);
      let t = e.includes(`\n`)
        ? e.split(/\n/).slice(0, 6)
        : parseCustomOptions(e);
      return t.length ? t : [``, ``];
    })(),
    _setCoItems = (e) => setCustomOptionsText(e.slice(0, 6).join(`\n`)),
    _setCoItem = (e, t) => {
      let n = [..._coItems];
      n[e] = t;
      _setCoItems(n);
    },
    _removeCoItem = (e) => _setCoItems(_coItems.filter((t, n) => n !== e)),
    _addCoItem = () => _coItems.length < 6 && _setCoItems([..._coItems, ``]),
    _a = parseCustomOptions(customOptionsText),
    voteOptions =
      answerType === `custom`
        ? _a
        : answerType === `yesno`
          ? [`YES`, `NO`]
          : [],
    canStart =
      phase === `setup` &&
      !busy &&
      !!topic.trim() &&
      activeModels().length >= 2 &&
      (answerType !== `custom` || _a.length >= 2),
    meetingPhases = [`meeting`, `voting`, `summary`],
    askAll = () => {
      phase === `setup` ||
        busy ||
        (setMobileTab(`room`),
        sendMeetingMessage(
          lang === `zh`
            ? `@all 每个模型给出一个最重要的下一步建议。`
            : `@all Give one most important next-step recommendation.`,
        ));
    },
    startFromHome = () => {
      (setMobileTab(`room`), startMeeting());
    },
    nextRoundAction = () => {
      (setMobileTab(`room`), continueNextRound());
    },
    voteAction = () => {
      (setMobileTab(`summary`), runVote());
    },
    summaryAction = () => {
      (setMobileTab(`summary`), summarizeMeeting());
    },
    newMeetingAction = () => {
      (setMenuOpen(false), setMobileTab(`room`), resetMeeting());
    },
    scrollToSection = (e) => {
      setMenuOpen(false);
      let t = () => {
        let t = document.getElementById(
          {
            chat: `topic-input`,
            past: `home-history`,
            models: `home-models`,
            stats: `home-stats`,
            about: `home-about`,
          }[e],
        );
        (e === `past` && t?.setAttribute(`open`, ``),
          t?.scrollIntoView({
            behavior: `smooth`,
            block: `start`,
          }),
          e === `chat` &&
            window.setTimeout(
              () => document.getElementById(`topic-input`)?.focus(),
              180,
            ));
      };
      phase === `setup` ? t() : (resetMeeting(), window.setTimeout(t, 120));
    },
    loadExampleQuestion = () => {
      (setMenuOpen(false),
        setTopic(translate(`exampleQuestion`)),
        setMode(`vote`),
        setAnswerType(`yesno`),
        setCustomOptionsText(``),
        scrollToSection(`chat`));
    },
    deferMenuAction = (e) => {
      (setMenuOpen(false), window.setTimeout(e, 0));
    },
    navigate = (e, t, n) => {
      if (
        (setMenuOpen(false),
        setRoute(e),
        setDetailId(n || null),
        typeof window < `u`)
      ) {
        let t = routePath(e, n);
        window.location.pathname !== t && window.history.pushState({}, ``, t);
      }
      (typeof t == `function` && t(),
        typeof window < `u` &&
          window.scrollTo({
            top: 0,
            behavior: `smooth`,
          }));
    },
    renderNavigation = () => {
      let e = route === `home`,
        t = [
          {
            key: `home`,
            label: translate(`navNewRoundtable`),
            active: e && phase === `setup`,
            action: () => navigate(`home`, newMeetingAction),
          },
          {
            key: `history`,
            label: translate(`navPastRoundtables`),
            active: route === `history`,
            action: () => navigate(`history`),
          },
          {
            key: `chat`,
            label: translate(`navChat`),
            active: route === `chat`,
            action: () => navigate(`chat`),
            badge: translate(`navNewBadge`),
          },
          {
            key: `stats`,
            label: translate(`navStats`),
            active: route === `stats`,
            action: () => navigate(`stats`),
          },
          {
            key: `about`,
            label: translate(`navAbout`),
            active: route === `about`,
            action: () => navigate(`about`),
          },
          {
            key: "settings",
            label: lang === "zh" ? "设置" : "Settings",
            active: route === "dashboard",
            action: () => navigate("dashboard"),
          },
        ];
      return (
        <header className={`rt-topnav`}>
          <div className={`rt-topnav-inner`}>
            <button
              type={`button`}
              className={`rt-brand`}
              onClick={() => navigate(`home`, newMeetingAction)}
              aria-label={`ChatOOP AI Roundtable home`}
            >
              <span className={`rt-brand-mark`}>
                <img
                  src={`/chatoop-logo-mark.png`}
                  alt={`ChatOOP AI Roundtable`}
                  style={{
                    width: `28px`,
                    height: `28px`,
                    objectFit: `contain`,
                    display: `block`,
                  }}
                />
              </span>
              <span className={`rt-brand-text`}>
                <span>{`ChatOOP AI Roundtable`}</span>
              </span>
            </button>
            <nav className={`rt-nav-links`} aria-label={`Primary`}>
              {t.map((e) => (
                <button
                  type={`button`}
                  className={`rt-nav-link ${e.active ? `is-active` : ``}`}
                  onClick={e.action || void 0}
                  key={e.key}
                >
                  {e.label}
                  {e.badge && <span className={`rt-nav-badge`}>{e.badge}</span>}
                </button>
              ))}
            </nav>
            <div className={`rt-nav-actions`}>
              {languageButton}
              {authUser ? (
                <React.Fragment>
                  <button
                    type={`button`}
                    className={`rt-nav-link rt-nav-login`}
                    onClick={() => navigate(`wallet`)}
                  >
                    {translate(`navWallet`)}
                  </button>
                  <button
                    type={`button`}
                    className={`rt-nav-signup`}
                    onClick={logout}
                  >
                    {translate(`navLogout`)}
                  </button>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <button
                    type={`button`}
                    className={`rt-nav-link rt-nav-login`}
                    onClick={() => navigate(`login`)}
                  >
                    {translate(`navLogin`)}
                  </button>
                  <button
                    type={`button`}
                    className={`rt-nav-signup`}
                    onClick={() => navigate(`signup`)}
                  >
                    {translate(`navSignup`)}
                  </button>
                </React.Fragment>
              )}
              <button
                type={`button`}
                className={`rt-menu-button`}
                aria-label={translate(`openMenu`)}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((e) => !e)}
              >{`☰`}</button>
              {menuOpen && (
                <div
                  className={`rt-menu-popover`}
                  aria-label={translate(`openMenu`)}
                >
                  <button
                    type={`button`}
                    onClick={() =>
                      deferMenuAction(() => navigate(`home`, newMeetingAction))
                    }
                  >
                    {translate(`navNewRoundtable`)}
                  </button>
                  <button
                    type={`button`}
                    onClick={() => deferMenuAction(() => navigate(`history`))}
                  >
                    {translate(`navPastRoundtables`)}
                  </button>
                  <button
                    type={`button`}
                    onClick={() => deferMenuAction(() => navigate(`chat`))}
                  >
                    {translate(`navChat`)}
                    {` `}
                    {translate(`navNewBadge`)}
                  </button>
                  <button
                    type={`button`}
                    onClick={() => deferMenuAction(() => navigate(`stats`))}
                  >
                    {translate(`navStats`)}
                  </button>
                  <button
                    type={`button`}
                    onClick={() => deferMenuAction(() => navigate(`about`))}
                  >
                    {translate(`navAbout`)}
                  </button>
                  {authUser && (
                    <button
                      type={`button`}
                      onClick={() =>
                        deferMenuAction(() => navigate(`dashboard`))
                      }
                    >
                      {translate(`navDashboard`)}
                    </button>
                  )}
                  {authUser && (
                    <button
                      type={`button`}
                      onClick={() => deferMenuAction(() => navigate(`wallet`))}
                    >
                      {translate(`navWallet`)}
                    </button>
                  )}
                  {authUser?.role === `admin` && (
                    <button
                      type={`button`}
                      onClick={() => deferMenuAction(() => navigate(`admin`))}
                    >
                      {translate(`navAdmin`)}
                    </button>
                  )}
                  <div className={`rt-menu-sep`} />
                  {authUser ? (
                    <button
                      type={`button`}
                      onClick={() => deferMenuAction(logout)}
                    >
                      {translate(`navLogout`)}
                    </button>
                  ) : (
                    <React.Fragment>
                      <button
                        type={`button`}
                        onClick={() => deferMenuAction(() => navigate(`login`))}
                      >
                        {translate(`navLogin`)}
                      </button>
                      <button
                        type={`button`}
                        onClick={() =>
                          deferMenuAction(() => navigate(`signup`))
                        }
                      >
                        {translate(`navSignup`)}
                      </button>
                    </React.Fragment>
                  )}
                  <div className={`rt-menu-note`}>
                    {translate(`navCreditsTip`)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      );
    },
    renderHero = () => (
      <section className={`rt-hero fadeUp`}>
        <div className={`rt-hero-copy`}>
          <h1>{translate(`heroTitle`)}</h1>
          <p>{translate(`heroSubtitle`)}</p>
          <button
            type={`button`}
            className={`rt-how-button`}
            onClick={() => setNavOpen((e) => !e)}
          >
            {translate(`howItWorks`)}
          </button>
          {navOpen && (
            <div className={`rt-how-note`}>{translate(`howItWorksText`)}</div>
          )}
        </div>
      </section>
    ),
    BRAND_THEMES = {
      Anthropic: {
        bg: `#E8D5B0`,
        color: `#7C4A1E`,
      },
      Google: {
        bg: `#E8F0FE`,
        color: `#1A73E8`,
      },
      OpenAI: {
        bg: `#E6F4F1`,
        color: `#10A37F`,
      },
      xAI: {
        bg: `#1C1C1E`,
        color: `#FFFFFF`,
      },
      "Moonshot AI": {
        bg: `#0D1117`,
        color: `#79C0FF`,
      },
      DeepSeek: {
        bg: `#DBEAFE`,
        color: `#1D4ED8`,
      },
      Meta: {
        bg: `#EFF6FF`,
        color: `#1D4ED8`,
      },
      "Mistral AI": {
        bg: `#FFF3E0`,
        color: `#E65100`,
      },
      Perplexity: {
        bg: `#E0F7FA`,
        color: `#00838F`,
      },
      Cohere: {
        bg: `#F3E8FF`,
        color: `#7E22CE`,
      },
      Fireworks: {
        bg: `#FFF1F2`,
        color: `#BE123C`,
      },
      Novita: {
        bg: `#F5F3FF`,
        color: `#6D28D9`,
      },
      Nebius: {
        bg: `#EFF6FF`,
        color: `#1D4ED8`,
      },
      DeepInfra: {
        bg: `#F0FDF4`,
        color: `#15803D`,
      },
      Qwen: {
        bg: `#FFF7ED`,
        color: `#C2410C`,
      },
      MiniMax: {
        bg: `#FDF4FF`,
        color: `#A21CAF`,
      },
      Hermes: {
        bg: `#FFF7ED`,
        color: `#C2410C`,
      },
      Kimi: {
        bg: `#EFF6FF`,
        color: `#2563EB`,
      },
    },
    brandTheme = (e) => {
      let t = BRAND_THEMES[e] || {
        bg: `#F1F5F9`,
        color: `#475569`,
      };
      return {
        background: t.bg,
        color: t.color,
      };
    },
    brandSymbol = (e) => {
      if (e.symbol && e.symbol !== `AI`) return e.symbol;
      let t = e.company || ``;
      return t.startsWith(`Anthropic`)
        ? `A`
        : t.startsWith(`Google`)
          ? `G`
          : t.startsWith(`OpenAI`)
            ? `⊕`
            : t === `xAI`
              ? `X`
              : t.startsWith(`DeepSeek`)
                ? `DS`
                : t.startsWith(`Meta`)
                  ? `M`
                  : t.startsWith(`Mistral`)
                    ? `≋`
                    : t.startsWith(`Perplexity`)
                      ? `P`
                      : t.startsWith(`Cohere`)
                        ? `C`
                        : t.startsWith(`Qwen`)
                          ? `Q`
                          : t.startsWith(`MiniMax`)
                            ? `MM`
                            : t.startsWith(`Moonshot`)
                              ? `K`
                              : (t || `AI`).slice(0, 2).toUpperCase();
    },
    renderModelAvatar = (e, t = {}) => {
      let n = e.logoUrl ? (
        <img
          src={e.logoUrl}
          alt={``}
          onError={(e) => {
            e.currentTarget.style.display = `none`;
          }}
        />
      ) : (
        brandSymbol(e)
      );
      return (
        <span
          className={`rt-model-brand-icon`}
          style={{
            ...brandTheme(e.company),
            ...t,
          }}
        >
          {n}
          {e.logoUrl ? (
            <span className={`rt-model-logo-fallback`}>{brandSymbol(e)}</span>
          ) : null}
        </span>
      );
    },
    renderModelPillIcon = (e, t = false) => (
      <span
        className={`rt-model-pill-symbol`}
        style={{
          background: t ? `${e.color}20` : `#E2E8F0`,
          color: t ? e.color : `#64748B`,
        }}
      >
        {e.logoUrl ? (
          <img
            src={e.logoUrl}
            alt={``}
            onError={(e) => {
              e.currentTarget.style.display = `none`;
            }}
          />
        ) : (
          e.symbol
        )}
        {e.logoUrl ? (
          <span className={`rt-model-logo-fallback`}>{e.symbol}</span>
        ) : null}
      </span>
    ),
    renderModelPicker = (e) => {
      if (!modelPickerOpen) return null;
      let t = modelSearch.trim().toLowerCase(),
        n = e,
        r = n.filter((e) =>
          `${e.name} ${e.company || ``} ${(e.tags || []).join(` `)}`
            .toLowerCase()
            .includes(t),
        ),
        i = activeModels(),
        a = i.map((e) => e.id),
        o = a.length < 6,
        s = a.length > 2,
        c = () => {
          (setModelPickerOpen(false), setModelSearch(``));
        };
      return (
        <div
          className={`rt-model-modal-backdrop`}
          role={`presentation`}
          onMouseDown={(e) => {
            e.target === e.currentTarget && c();
          }}
        >
          <section
            className={`rt-model-modal`}
            role={`dialog`}
            aria-modal={`true`}
            aria-label={translate(`modelCatalogTitle`)}
          >
            <div className={`rt-model-modal-head`}>
              <h2>{`Add models`}</h2>
              <button
                type={`button`}
                className={`rt-ghost-button`}
                aria-label={translate(`modelCatalogClose`)}
                onClick={c}
              >{`x`}</button>
            </div>
            <div className={`rt-model-modal-body`}>
              <div className={`rt-model-modal-left`}>
                <div className={`rt-model-modal-search-wrap`}>
                  <svg
                    width={`15`}
                    height={`15`}
                    viewBox={`0 0 15 15`}
                    fill={`none`}
                    aria-hidden={`true`}
                  >
                    <circle
                      cx={`6.5`}
                      cy={`6.5`}
                      r={`5`}
                      stroke={`currentColor`}
                      strokeWidth={`1.5`}
                    />
                    <path
                      d={`m11 11 2.5 2.5`}
                      stroke={`currentColor`}
                      strokeWidth={`1.5`}
                      strokeLinecap={`round`}
                    />
                  </svg>
                  <input
                    className={`rt-model-modal-search`}
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder={`Search ${n.length} models...`}
                    autoFocus={true}
                  />
                  {modelSearch && (
                    <button
                      type={`button`}
                      className={`rt-ghost-button`}
                      style={{
                        padding: `2px 6px`,
                        fontSize: `0.8rem`,
                      }}
                      onClick={() => setModelSearch(``)}
                    >{`x`}</button>
                  )}
                </div>
                <div className={`rt-model-modal-list`}>
                  {r.map((e) => {
                    let t = a.includes(e.id),
                      n =
                        e.connected === false ||
                        (!t && !o) ||
                        (t && !s) ||
                        isModelDisabled(e.id);
                    return (
                      <div
                        className={`rt-model-modal-row`}
                        role={`checkbox`}
                        aria-checked={t}
                        tabIndex={n ? -1 : 0}
                        style={{
                          opacity: n ? 0.45 : 1,
                          cursor: n ? `default` : `pointer`,
                        }}
                        onClick={() => {
                          n || toggleModel(e.id);
                        }}
                        onKeyDown={(t) => {
                          !n &&
                            (t.key === `Enter` || t.key === ` `) &&
                            toggleModel(e.id);
                        }}
                        key={e.id || e.name}
                      >
                        <span
                          className={`rt-model-modal-check ${t ? `is-on` : ``}`}
                        >
                          {t && (
                            <span className={`rt-model-check-tick`}>{`v`}</span>
                          )}
                        </span>
                        {renderModelAvatar(e)}
                        <span className={`rt-model-row-info`}>
                          <span className={`rt-model-row-name`}>{e.name}</span>
                          <span className={`rt-model-row-company`}>
                            {e.company || ``}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  {r.length === 0 && (
                    <div
                      className={`rt-model-lineup-empty`}
                    >{`No models found`}</div>
                  )}
                </div>
              </div>
              <div className={`rt-model-modal-right`}>
                <div className={`rt-model-lineup-head`}>
                  <span>{`Your lineup`}</span>
                  <span className={`rt-model-lineup-badge`}>{a.length}</span>
                </div>
                <div className={`rt-model-lineup-list`}>
                  {i.length === 0 ? (
                    <div
                      className={`rt-model-lineup-empty`}
                    >{`No models selected`}</div>
                  ) : (
                    i.map((e) => (
                      <div className={`rt-model-lineup-row`} key={e.id}>
                        {renderModelAvatar(e, {
                          width: 22,
                          height: 22,
                          fontSize: `0.62rem`,
                        })}
                        <span className={`rt-model-lineup-name`}>{e.name}</span>
                        <button
                          type={`button`}
                          className={`rt-model-lineup-remove`}
                          disabled={!s}
                          onClick={() => toggleModel(e.id)}
                          title={translate(`removePanelist`)}
                        >{`x`}</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className={`rt-model-modal-footer`}>
              <span className={`rt-model-modal-count`}>
                {a.length}
                {` models selected - Roundtable`}
              </span>
              <button
                type={`button`}
                className={`rt-primary-button`}
                style={{
                  padding: `8px 22px`,
                  fontSize: `0.9rem`,
                }}
                onClick={c}
              >{`Done`}</button>
            </div>
          </section>
        </div>
      );
    },
    upvoteDiscussion = (e) => {
      (setPublicDiscussions((t) =>
        t.map((t) =>
          t.id === e
            ? {
                ...t,
                upvotes: (t.upvotes || 0) + 1,
                _voted: true,
              }
            : t,
        ),
      ),
        upvoteDiscussionAPI(e).then((t) => {
          t &&
            typeof t.upvotes == `number` &&
            setPublicDiscussions((n) =>
              n.map((n) =>
                n.id === e
                  ? {
                      ...n,
                      upvotes: t.upvotes,
                    }
                  : n,
              ),
            );
        }));
    },
    changeHistoryPage = (e) => {
      let t = Math.max(1, Math.min(historyPages || 1, e));
      if ((setHistoryPage(t), typeof window < `u` && route === `history`)) {
        let e = `${routePath(`history`)}${t > 1 ? `?page=${t}` : ``}`;
        window.history.pushState({}, ``, e);
      }
    },
    renderHistory = () => {
      let e = (e) => {
          let t = Math.max(0, Date.now() - (e || 0)),
            n = Math.floor(t / 36e5);
          if (n < 1) return translate(`timeAgoNow`);
          if (n < 24)
            return translate(`timeAgoHours`, {
              n,
            });
          let r = Math.floor(n / 24);
          return r === 1
            ? translate(`timeAgoYesterday`)
            : translate(`timeAgoDays`, {
                n: r,
              });
        },
        t = historyCategories.length
          ? historyCategories
          : DISCUSSION_CATEGORIES,
        n = publicDiscussions.slice(0, 6),
        r = publicDiscussions;
      return (
        <div className={`rt-app`}>
          {renderNavigation()}
          <main className={`rt-shell`}>
            <section className={`rt-hist fadeUp`}>
              <h1 className={`rt-hist-title`}>{translate(`histTitle`)}</h1>
              <p className={`rt-hist-intro`}>
                {translate(`browseAllDiscussions`)}
              </p>
              <input
                className={`rt-hist-search`}
                value={historyAnswerType}
                onChange={(e) => {
                  (setHistoryAnswerType(e.target.value), setHistoryPage(1));
                }}
                placeholder={translate(`histSearchPlaceholder`)}
                aria-label={translate(`histSearchPlaceholder`)}
              />
              <details className={`rt-hist-filter-drawer`}>
                <summary>{translate(`histFilters`)}</summary>
                <div className={`rt-hist-filters`}>
                  <select
                    className={`rt-hist-select`}
                    value={historySort}
                    onChange={(e) => {
                      (setHistorySort(e.target.value), setHistoryPage(1));
                    }}
                    aria-label={translate(`histSortLabel`)}
                  >
                    <option value={`hot`}>{translate(`histSortHot`)}</option>
                    <option value={`new`}>{translate(`histSortNew`)}</option>
                  </select>
                  <select
                    className={`rt-hist-select`}
                    value={historySearch}
                    onChange={(e) => {
                      (setHistorySearch(e.target.value), setHistoryPage(1));
                    }}
                    aria-label={translate(`histCategoryLabel`)}
                  >
                    <option value={``}>{translate(`histCategoryAll`)}</option>
                    {t.map((e) => (
                      <option value={e} key={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                  <select
                    className={`rt-hist-select`}
                    value={historyCategory}
                    onChange={(e) => {
                      (setHistoryCategory(e.target.value), setHistoryPage(1));
                    }}
                    aria-label={translate(`histModeLabel`)}
                  >
                    <option value={``}>{translate(`histModeAll`)}</option>
                    <option value={`vote`}>{translate(`histModePoll`)}</option>
                    <option value={`debate`}>
                      {translate(`histModeDebate`)}
                    </option>
                  </select>
                  <select
                    className={`rt-hist-select`}
                    value={historyMode}
                    onChange={(e) => {
                      (setHistoryMode(e.target.value), setHistoryPage(1));
                    }}
                    aria-label={translate(`histLanguageLabel`)}
                  >
                    <option value={``}>{translate(`histLanguageAll`)}</option>
                    <option value={`en`}>
                      {translate(`histLanguageEnglish`)}
                    </option>
                    <option value={`zh`}>
                      {translate(`histLanguageChinese`)}
                    </option>
                  </select>
                </div>
              </details>
              {historyLoading && (
                <div className={`rt-hist-status`}>{translate(`loading`)}</div>
              )}
              {!historyLoading && historyError && (
                <div className={`rt-hist-status`}>
                  {historyError.detail || translate(`err_generic`)}
                </div>
              )}
              {!historyLoading &&
                !historyError &&
                publicDiscussions.length === 0 && (
                  <div className={`rt-hist-status`}>
                    {translate(`histEmpty`)}
                  </div>
                )}
              {!historyLoading &&
                !historyError &&
                publicDiscussions.length > 0 && (
                  <div className={`rt-detail-muted`}>
                    {translate(`histCount`, {
                      n: historyTotal,
                    })}
                  </div>
                )}
              <div className={`rt-hist-list`}>
                {n.map((t) => (
                  <article
                    className={`rt-hist-card`}
                    role={`button`}
                    tabIndex={0}
                    onClick={() => navigate(`question`, null, t.id)}
                    onKeyDown={(e) => {
                      (e.key === `Enter` || e.key === ` `) &&
                        navigate(`question`, null, t.id);
                    }}
                    key={t.id}
                  >
                    <div className={`rt-hist-card-body`}>
                      <p className={`rt-hist-q`}>{t.question}</p>
                      <div className={`rt-hist-meta`}>
                        <button
                          type={`button`}
                          className={`rt-hist-upvote ${t._voted ? `is-voted` : ``}`}
                          onClick={(e) => {
                            (e.stopPropagation(), upvoteDiscussion(t.id));
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          aria-label={translate(`histUpvote`)}
                          title={translate(`histUpvote`)}
                        >
                          {`▲ `}
                          {t.upvotes || 0}
                        </button>
                        <span>
                          {t.modeLabel ||
                            discussionTypeLabel(t.mode, t.answerType)}
                        </span>
                        <span className={`rt-hist-dot`}>{`·`}</span>
                        <span>{t.category}</span>
                        <span className={`rt-hist-dot`}>{`·`}</span>
                        <span>
                          {translate(`histModels`, {
                            n: t.models || 0,
                          })}
                          {Array.isArray(t.modelNames) &&
                          t.modelNames.length > 6
                            ? ` +${t.modelNames.length - 6}`
                            : ``}
                        </span>
                      </div>
                    </div>
                    <span className={`rt-hist-time`}>{e(t.createdAt)}</span>
                  </article>
                ))}
              </div>
              {!historyLoading && !historyError && r.length > 0 && (
                <section className={`rt-detail-section`}>
                  <h2>{translate(`histAllTitle`)}</h2>
                  <div className={`rt-hist-compact-list`}>
                    {r.map((e) => (
                      <button
                        type={`button`}
                        className={`rt-hist-compact-link`}
                        onClick={() => navigate(`question`, null, e.id)}
                        title={e.question}
                        key={`compact-${e.id}`}
                      >
                        {e.question}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {historyPages > 1 && (
                <div className={`rt-hist-pager`}>
                  <button
                    type={`button`}
                    className={`rt-ghost-button`}
                    disabled={historyPage >= historyPages}
                    onClick={() => changeHistoryPage(historyPage + 1)}
                  >
                    {translate(`histNext`)}
                  </button>
                  {historyPage > 1 && (
                    <button
                      type={`button`}
                      className={`rt-ghost-button`}
                      onClick={() => changeHistoryPage(historyPage - 1)}
                    >
                      {translate(`histPrev`)}
                    </button>
                  )}
                </div>
              )}
            </section>
          </main>
        </div>
      );
    },
    findChatModel = (e) => {
      let t = String(e || ``).trim();
      if (!t) return null;
      let n = t.toLowerCase(),
        r = n.replace(/[^a-z0-9]/g, ``);
      return (
        modelCatalog.find((e) => {
          let t = String(e.id || ``).toLowerCase(),
            i = String(e.name || ``).toLowerCase(),
            a = t.split(`/`).pop() || t,
            o = i.replace(/[^a-z0-9]/g, ``);
          return t === n || i === n || a === n || o === r || o.startsWith(r);
        }) || null
      );
    },
    chatModel = (e) =>
      findChatModel(e) || {
        id: e || `assistant`,
        name:
          String(e || ``)
            .split(`/`)
            .pop() || `AI`,
        symbol: `AI`,
        color: `#64748B`,
      },
    renderChatAvatar = (e, t = `rt-message-avatar`) => {
      let n = brandSymbol(e);
      return (
        <span
          className={t}
          style={{
            "--model-color": e.color,
          }}
          title={e.name}
        >
          {e.logoUrl ? (
            <img
              src={e.logoUrl}
              alt={``}
              onError={(e) => {
                e.currentTarget.style.display = `none`;
              }}
            />
          ) : (
            n
          )}
          {e.logoUrl ? (
            <span className={`rt-model-logo-fallback`}>{n}</span>
          ) : null}
        </span>
      );
    },
    newChat = () => {
      stopDiscussion();
      resetPersonas();
      let e = newChatSession({
        models: normalizeChatModels(chatModels) || loadDefaultModels(),
        mode: chatMode,
      });
      (setChatSessions((t) =>
        [e, ...t.filter((t) => t.id !== e.id)].slice(0, 20),
      ),
        setActiveChatId(e.id),
        setChatMessages([]),
        setChatInput(``),
        setAttachments([]),
        setChatModelSearch(``));
    },
    openChat = (e) => {
      stopDiscussion();
      let t = chatSessions.find((t) => t.id === e);
      t &&
        (setActiveChatId(t.id),
        setChatMessages(t.msgs || []),
        setChatMode(t.mode || `roundtable`),
        setChatModels(normalizeChatModels(t.models) || DEFAULT_MODEL_IDS),
        setChatInput(``),
        setAttachments([]),
        setChatModelSearch(``));
    },
    deleteChat = (e) => {
      if (e === activeChatId) stopDiscussion();
      setChatSessions((t) => {
        let n = t.filter((t) => t.id !== e),
          r = n.length ? n : [newChatSession()];
        if (e === activeChatId) {
          let e = r[0];
          (setActiveChatId(e.id),
            setChatMessages(e.msgs || []),
            setChatMode(e.mode || `roundtable`),
            setChatModels(normalizeChatModels(e.models) || DEFAULT_MODEL_IDS),
            setChatInput(``),
            setAttachments([]),
            setChatModelSearch(``));
        }
        return r;
      });
    },
    withAttachments = (e) =>
      [
        e,
        attachments.length
          ? [
              lang === `zh` ? `附件上下文:` : `Attached context:`,
              ...attachments.map((e, t) => {
                let n = `${t + 1}. ${e.name} (${e.type || `unknown`}, ${e.sizeLabel})`;
                return e.text ? `${n}\n${e.text}` : n;
              }),
            ].join(`

`)
          : ``,
      ].filter(Boolean).join(`

`),
    languageHint = (e) => {
      let t = String(e || ``),
        r = /[\u3400-\u9fff]/.test(t),
        i = /[A-Za-z]/.test(t);
      return r
        ? `Reply in Chinese, matching the user's language. Do not switch to English unless the user asks.`
        : i
          ? `Reply in the same language as the user's message. Do not switch languages unless the user asks.`
          : lang === `zh`
            ? `Reply in Chinese unless the user clearly asks for another language.`
            : `Reply in the same language as the user's message.`;
    },
    formatPanelAnswers = (e) => {
      let t = e.filter((e) => String(e.content || ``).trim());
      return t.length
        ? t.map((e) => `${e.modelName}: ${e.content}`).join(`

`)
        : ``;
    },
    attachFiles = async (e) => {
      let t = Array.from(e || []).slice(0, Math.max(0, 5 - attachments.length));
      if (!t.length) return;
      let n = await Promise.all(
        t.map(async (e) => {
          let t = ``;
          if (isTextAttachment(e) && e.size <= 1024 * 1024)
            try {
              t = (await e.text()).slice(0, 12e3);
            } catch {
              t = ``;
            }
          return {
            id: `${generateId()}_${Math.random().toString(36).slice(2, 6)}`,
            name: e.name || `attachment`,
            type: e.type || `file`,
            size: e.size || 0,
            sizeLabel: formatFileSize(e.size || 0),
            text: t,
          };
        }),
      );
      (setAttachments((e) => [...e, ...n].slice(0, 5)),
        fileInputRef.current && (fileInputRef.current.value = ``));
    },
    removeAttachment = (e) => {
      setAttachments((t) => t.filter((t) => t.id !== e));
    },
    toggleChatModel = (e) => {
      isModelDisabled(e) ||
        setChatModels((t) =>
          t.includes(e)
            ? t.length > 1
              ? t.filter((t) => t !== e)
              : t
            : t.length < 6
              ? [...t, e]
              : t,
        );
    },
    $a = chatInput.match(/(^|\s)@([\w./:-]*)$/i),
    eo = $a ? $a[2].toLowerCase() : ``,
    to = (e) =>
      `${e.id} ${e.name} ${e.company || ``}`.toLowerCase().includes(eo),
    no = $a
      ? chatModels
          .map((e) => chatModel(e))
          .filter((e) => e?.id && !isModelDisabled(e.id))
          .filter(to)
          .slice(0, 5)
      : [],
    ro = new Set(no.map((e) => e.id)),
    io = $a
      ? modelCatalog
          .filter((e) => !isModelDisabled(e.id) && !ro.has(e.id))
          .filter(to)
          .slice(0, 8)
      : [],
    ao = [...no, ...io],
    oo = (e) => {
      if (!e || isModelDisabled(e.id)) return;
      let t = String(e.name || e.id).trim();
      (window._rtMM = window._rtMM || {})[t] = e.id;
      setChatInput((n) => n.replace(/(^|\s)@([\w./:-]*)$/i, `$1@${t} `));
    },
    parseMentions = (e, t) => {
      let mm = window._rtMM || {},
        mp = Object.entries(mm).filter(
          ([n, id]) =>
            String(e || ``).includes(`@${n}`) && !isModelDisabled(id),
        );
      if (mp.length) {
        let ids = [...new Set(mp.map(([, id]) => id))],
          clean = mp
            .reduce((s, [n]) => s.split(`@${n}`).join(``), String(e || ``))
            .trim();
        return {
          targetIds: ids,
          cleanText: clean || e,
          isExplicitTarget: true,
        };
      }
      {
        let p = [...String(e || ``).matchAll(/@\[([^|]+)\|([^\]]+)\]/g)];
        if (p.length) {
          let ids = [
            ...new Set(p.map((m) => m[2]).filter((id) => !isModelDisabled(id))),
          ];
          if (ids.length) {
            let clean = String(e || ``)
              .replace(/@\[([^|]+)\|([^\]]+)\]/g, `@$1`)
              .trim();
            return {
              targetIds: ids,
              cleanText: clean || e,
              isExplicitTarget: true,
            };
          }
        }
      }
      let n = String(e || ``)
        .trim()
        .match(/^@([^\s]+)\s*(.*)$/i);
      if (!n)
        return {
          targetIds: t,
          cleanText: e,
          isExplicitTarget: false,
        };
      let r = n[1].toLowerCase(),
        i = n[2]?.trim() || e;
      if (r === `all` || r === `roundtable`)
        return {
          targetIds: t,
          cleanText: i,
          isExplicitTarget: true,
        };
      let a = r.replace(/[^a-z0-9]/g, ``),
        o = modelCatalog.find((e) => {
          let t = String(e.name || ``)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ``),
            n = String(e.id || ``).toLowerCase(),
            i = n.split(`/`).pop() || n;
          return (
            n === r || n.startsWith(r) || i === r || t === a || t.startsWith(a)
          );
        });
      return o && !isModelDisabled(o.id)
        ? {
            targetIds: [o.id],
            cleanText: i,
            isExplicitTarget: true,
          }
        : {
            targetIds: t,
            cleanText: e,
            isExplicitTarget: false,
          };
    },
    decorateVotes = (e) =>
      (e || []).map((e) => {
        let t = getModel(e.modelId) || chatModel(e.modelId || e.modelName);
        return {
          ...e,
          color: t?.color || `#64748B`,
          symbol: t?.symbol || `AI`,
        };
      }),
    normalizeVoteOptions = (e) => {
      let t = Array.isArray(e)
          ? e
              .map((e) => String(e || ``).trim())
              .filter(Boolean)
              .slice(0, 6)
          : [],
        n = t.length >= 2 ? t : [`YES`, `NO`];
      return n.filter((e) => String(e).toUpperCase() !== `INVALID`);
    },
    voteLabel = (e) => {
      let t = String(e || ``).toUpperCase();
      return t === `YES`
        ? translate(`voteYes`)
        : t === `NO`
          ? translate(`voteNo`)
          : t === `INVALID`
            ? translate(`voteInvalid`)
            : e || `—`;
    },
    voteCountLabel = (e) => {
      let t = String(e || ``).toUpperCase();
      return t === `YES`
        ? translate(`yesVotes`)
        : t === `NO`
          ? translate(`noVotes`)
          : t === `INVALID`
            ? translate(`invalidVotes`)
            : e || `—`;
    },
    sendChat = async (forced, options = {}) => {
      const raw = String(forced ?? chatInput).trim();
      if (!raw || discussionAbortRef.current) return;
      const conversationId = activeChatId;
      const selectedIds = (
        normalizeChatModels(options.models) || chatModels
      ).filter((id) => !isModelDisabled(id));
      const parsed = parseMentions(raw, selectedIds);
      const ids = parsed.targetIds;
      if (!ids.length) return;
      const effectiveMode = options.discussionMode || discussionMode;
      if (options.discussionMode) setDiscussionMode(options.discussionMode);
      const hostText = parsed.cleanText || raw;
      const topicText = withAttachments(hostText);
      const runId = generateId();
      const controller = new AbortController();
      discussionAbortRef.current = controller;
      const history = chatMessagesRef.current.slice();
      const live = () =>
        activeConversationRef.current === conversationId &&
        !controller.signal.aborted;
      const update = (fn) => {
        if (live())
          setChatMessages((previous) => {
            const next = fn(previous);
            chatMessagesRef.current = next;
            return next;
          });
      };
      update((previous) => [
        ...previous,
        {
          id: runId + "_host",
          role: "user",
          content: hostText,
          attachments: attachments.map(({ name, sizeLabel }) => ({
            name,
            sizeLabel,
          })),
        },
      ]);
      setChatInput("");
      setAttachments([]);
      setChatBusy(true);
      try {
        if ((options.mode || chatMode) === "single" || ids.length === 1) {
          const id = runId + "_single";
          update((previous) => [
            ...previous,
            {
              id,
              role: "assistant",
              kind: "single",
              model: ids[0],
              content: "",
              streaming: true,
            },
          ]);
          const messages = [
            ...history
              .filter((m) => m.role === "user" || m.kind === "single")
              .slice(-20)
              .map((m) => ({
                role: m.role,
                content: m.content,
              })),
            {
              role: "user",
              content: topicText,
            },
          ];
          const reply = await reliableChatAPI(
            ids[0],
            messages,
            (token) =>
              update((previous) =>
                previous.map((m) =>
                  m.id === id
                    ? {
                        ...m,
                        content: m.content + token,
                      }
                    : m,
                ),
              ),
            {
              signal: controller.signal,
            },
          );
          update((previous) =>
            previous.map((m) =>
              m.id === id
                ? {
                    ...m,
                    content: reply,
                    streaming: false,
                  }
                : m,
            ),
          );
          recordUsage("chat", 1, 0);
        } else {
          const models = ids.map((id) => chatModel(id));
          const result = await runDiscussion({
            topic: topicText,
            models,
            mode: effectiveMode,
            rounds: autoRoundLimit,
            history,
            lang,
            personas: MODEL_PERSONAS,
            signal: controller.signal,
            ask: (model, messages, opts) =>
              opts.purpose === "assessment"
                ? chatAPI(model, messages, {
                    signal: opts.signal,
                  })
                : reliableChatAPI(model, messages, opts.onToken, {
                    signal: opts.signal,
                  }),
            onStart: ({ id, model, round }) =>
              update((previous) => [
                ...previous,
                {
                  id: runId + ":" + id,
                  runId,
                  role: "assistant",
                  kind: "model",
                  model: model.id,
                  modelName: model.name,
                  round,
                  content: "",
                  streaming: true,
                },
              ]),
            onToken: ({ id, token }) =>
              update((previous) =>
                previous.map((m) =>
                  m.id === runId + ":" + id
                    ? {
                        ...m,
                        content: m.content + token,
                      }
                    : m,
                ),
              ),
            onReply: (turn) =>
              update((previous) =>
                previous.map((m) =>
                  m.id === runId + ":" + turn.id
                    ? {
                        ...m,
                        content: turn.content,
                        error: turn.error,
                        streaming: false,
                      }
                    : m,
                ),
              ),
            onRound: ({ round, turns, assessment }) =>
              update((previous) => [
                ...previous,
                {
                  id: runId + ":round:" + round,
                  runId,
                  role: "assistant",
                  kind: "roundtable",
                  topic: hostText,
                  round,
                  results: turns.filter((t) => t.round === round && !t.error),
                  transcript: turns,
                  assessment,
                  models: ids,
                  content: "",
                  summary: "",
                },
              ]),
          });
          if (live()) {
            const id = runId + ":round:" + result.completedRounds;
            const card = {
              id,
              runId,
              topic: hostText,
              results: result.turns.filter(
                (t) => t.round === result.completedRounds && !t.error,
              ),
              transcript: result.turns,
              assessments: result.assessments,
              completedRounds: result.completedRounds,
              stoppedBy: result.stoppedBy,
              changes: result.changes,
            };
            update((previous) =>
              previous.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      ...card,
                    }
                  : m,
              ),
            );
            recordUsage(
              "chat roundtable",
              ids.length * result.completedRounds,
              0,
            );
            if (effectiveMode === "debate_auto")
              await summarizeCard(card, {
                signal: controller.signal,
                conversationId,
              });
          }
        }
      } catch (error) {
        if (live() && error.name !== "AbortError")
          update((previous) => [
            ...previous,
            {
              id: runId + "_error",
              role: "assistant",
              kind: "error",
              content: error.message,
            },
          ]);
      } finally {
        if (activeConversationRef.current === conversationId) {
          setChatMessages((previous) =>
            previous.map((m) =>
              m.runId === runId
                ? {
                    ...m,
                    streaming: false,
                  }
                : m,
            ),
          );
          setChatBusy(false);
        }
        if (discussionAbortRef.current === controller)
          discussionAbortRef.current = null;
      }
    },
    chatTranscript = () =>
      chatMessages
        .filter((e) => String(e.content || e.summary || ``).trim())
        .slice(-16)
        .map((e) =>
          e.role === `user`
            ? `Host: ${e.content}`
            : e.kind === `model`
              ? `${chatModel(e.model).name}: ${e.content}`
              : e.kind === `roundtable`
                ? `RT: ${e.summary || e.content}`
                : `Assistant: ${e.content}`,
        ).join(`

`),
    summaryPrompt = (e, t) => {
      let r = t
        .map((e) => e.modelName)
        .filter(Boolean)
        .join(`, `);
      return lang === `zh`
        ? [
            `请为这轮圆桌回答生成一张紧凑的摘要卡。用户问题：${e || currentChatTopic()}`,
            r ? `参与模型：${r}` : ``,
            `只输出纯文本，不要使用 Markdown 标题或加粗符号。整段只输出卡片内容本身，不要任何自我评价、解释、英文备注或“这段很准确”之类的话。`,
            `第一行只写一句综合结论，不加标题或前缀，最多 80 个中文字符。`,
            `然后另起两行，严格基于本场实际辩论，用中文冒号输出：`,
            `立场改变：<本场中“最终预测的胜方/答案”真正发生翻转的模型数量，只写阿拉伯数字>（判定标准：只有当某模型最终选择的胜方或答案从一个选项换成了另一个选项，才算“改变立场”；以下都【不算】改变：信心强弱的调整（如由“明显”改为“微弱”）、更换论证角度或论据、认同对方某个论点但最终结论不变、语气上的让步；请逐个模型对比其首轮与末轮最终选定的答案后再计数；简述谁由哪个答案改为哪个答案；没有就写 0）`,
            `共识程度：<在 完全共识/高度共识/部分共识/分歧较大 中四选一>`,
            `然后必须输出以下三个小节标题；信息不足也要给出一句概括：`,
            `共识点`,
            `- 1 到 2 条共同判断`,
            `分歧点`,
            `- 1 到 2 条关键差异`,
            `结论置信度`,
            `高/中/低 + 一句话说明依据`,
          ].filter(Boolean).join(`
`)
        : [
            `Create a compact summary card for this roundtable. User question: ${e || currentChatTopic()}`,
            r ? `Models: ${r}` : ``,
            `Plain text only. Do not use Markdown headings or bold markers.`,
            `Start with one short conclusion sentence without a heading or prefix.`,
            `Then output two lines, strictly based on THIS debate, using a colon:`,
            `StanceChanges: <number of models whose FINAL chosen winner/answer actually flipped to a DIFFERENT option, digits only>(Rule: count a model only if its final selected winner/answer switched from one option to another. Do NOT count: changes in confidence level (e.g. 'clearly' -> 'slightly'), swapped arguments or framing, or conceding a point while the final conclusion stays the same. Compare each model's first-round vs last-round final pick before counting; note who switched from->to; 0 if none)`,
            `Consensus level: <one of Full Consensus/High Consensus/Partial Consensus/Divided>`,
            `Then always output exactly these three section headings, even if the evidence is thin:`,
            `Consensus`,
            `- 1 to 2 shared conclusions`,
            `Divergence`,
            `- 1 to 2 meaningful differences`,
            `Confidence`,
            `High/Medium/Low + one sentence explaining why`,
          ].filter(Boolean).join(`
`);
    },
    parseSummarySections = (e) => {
      let t = lang === `zh` ? `摘要` : `Summary`,
        r = [],
        i = null,
        a = (e) => {
          let t = e
            .replace(/^[#*\s-]+|[*：:]+$/g, ``)
            .trim()
            .toLowerCase();
          if (!t) return null;
          if (
            t.startsWith(`共识`) ||
            t.startsWith(`consensus`) ||
            t.startsWith(`agreement`)
          )
            return lang === `zh` ? `共识点` : `Consensus`;
          if (
            t.startsWith(`分歧`) ||
            t.startsWith(`diverge`) ||
            t.startsWith(`disagree`) ||
            t.startsWith(`difference`)
          )
            return lang === `zh` ? `分歧点` : `Divergence`;
          if (
            t.startsWith(`结论`) ||
            t.startsWith(`置信`) ||
            t.startsWith(`conclusion`) ||
            t.startsWith(`confidence`) ||
            t.startsWith(`risk`)
          )
            return lang === `zh` ? `结论置信度` : `Confidence`;
          if (
            t.startsWith(`最值`) ||
            t.startsWith(`standout`) ||
            t.startsWith(`best to`)
          )
            return lang === `zh` ? `最值得看` : `Standout`;
          if (
            t.startsWith(`建议`) ||
            t.startsWith(`follow`) ||
            t.startsWith(`next`)
          )
            return lang === `zh` ? `建议追问` : `Follow-up`;
          return null;
        };
      return (
        String(e || ``)
          .replace(/\r/g, ``)
          .split(
            `
`,
          )
          .map((e) => e.trim())
          .filter(Boolean)
          .forEach((e) => {
            let n = a(e);
            if (n) {
              ((i = {
                title: n,
                lines: [],
              }),
                r.push(i));
              return;
            }
            (i ||
              ((i = {
                title: t,
                lines: [],
              }),
              r.push(i)),
              i.lines.push(e.replace(/^[-•]\s*/, ``)));
          }),
        r.filter((e) => e.lines.length)
      );
    },
    summarizeCard = async (card, options = {}) => {
      const conversationId = options.conversationId || activeChatId;
      const live = () =>
        activeConversationRef.current === conversationId &&
        !options.signal?.aborted;
      const turns =
        Array.isArray(card.transcript) && card.transcript.length
          ? card.transcript
          : chatMessagesRef.current
              .filter(
                (m) =>
                  m.kind === "model" &&
                  (!card.runId || m.runId === card.runId) &&
                  m.content,
              )
              .map((m) => ({
                modelId: m.model,
                modelName: m.modelName || chatModel(m.model).name,
                round: m.round || 1,
                content: m.content,
                error: m.error,
              }));
      if (
        !card.id ||
        turns.filter((t) => !t.error).length < 2 ||
        card.summaryLoading
      )
        return;
      const update = (values) => {
        if (live())
          setChatMessages((previous) =>
            previous.map((m) =>
              m.id === card.id
                ? {
                    ...m,
                    ...values,
                  }
                : m,
            ),
          );
      };
      update({
        summaryLoading: true,
        summaryError: "",
      });
      try {
        const modelId = turns.find((t) => !t.error)?.modelId;
        const content = await chatAPI(
          modelId,
          summaryMessages({
            topic: card.topic || currentChatTopic(),
            turns,
            assessments: card.assessments || [],
            lang,
          }),
          {
            signal: options.signal,
          },
        );
        if (!content.trim())
          throw new Error(
            lang === "zh" ? "摘要没有返回内容" : "No summary was returned",
          );
        update({
          summary: content,
          summaryLoading: false,
          summaryError: "",
          transcript: turns,
          completedRounds:
            card.completedRounds || Math.max(...turns.map((t) => t.round || 1)),
        });
      } catch (error) {
        update({
          summaryLoading: false,
          summaryError: error.name === "AbortError" ? "" : error.message,
        });
      }
    },
    currentChatTopic = () =>
      [...chatMessages]
        .reverse()
        .find((e) => e.role === `user` && String(e.content || ``).trim())
        ?.content || translate(`chatRoomTitle`),
    runChatVote = async ({
      topic: e,
      models: t,
      options: r = [],
      context: i,
      addUserMessage: a = false,
    } = {}) => {
      if (chatBusy) return;
      let o = (normalizeChatModels(t) || chatModels).filter(
          (e) => !isModelDisabled(e),
        ),
        s = String(e || currentChatTopic() || ``).trim();
      if (!s || o.length < 1) return;
      const voteConversationId = activeChatId;
      const voteController = new AbortController();
      discussionAbortRef.current = voteController;
      const isLiveVote = () =>
        activeConversationRef.current === voteConversationId &&
        !voteController.signal.aborted;
      let c = usageAmount(o.length, 0.01);
      if (!hasCredits(c)) {
        isLiveVote() &&
          setChatMessages((e) => [
            ...e,
            {
              id: `${generateId()}_e`,
              role: `assistant`,
              kind: `error`,
              content: translate(`err_insufficientCredits`, {
                amount: c.toFixed(4),
              }),
            },
          ]);
        return;
      }
      let l = normalizeVoteOptions(r),
        u = `${generateId()}_vote`,
        d = a
          ? {
              id: `${generateId()}_u`,
              role: `user`,
              content: s,
              attachments: [],
            }
          : null,
        f = String(i || chatTranscript() || `Host: ${s}`).trim();
      (isLiveVote() &&
        setChatMessages((e) => [
          ...e,
          ...(d ? [d] : []),
          {
            id: u,
            role: `assistant`,
            kind: `vote`,
            topic: s,
            votes: [],
            models: o.slice(),
            pendingModelIds: o.slice(),
            errors: {},
            options: l,
            loading: true,
          },
        ]),
        isLiveVote() && setChatBusy(true));
      try {
        (await Promise.allSettled(
          o.map(async (e) => {
            try {
              let t = decorateVotes(
                await callVoteAPI(s, [e], f, l, null, lang, false, {
                  signal: voteController.signal,
                }),
              );
              isLiveVote() &&
                setChatMessages((n) =>
                  n.map((n) => {
                    if (n.id !== u) return n;
                    let r = [
                        ...(Array.isArray(n.votes) ? n.votes : []).filter(
                          (t) => t.modelId !== e,
                        ),
                        ...t,
                      ].sort(
                        (e, t) => o.indexOf(e.modelId) - o.indexOf(t.modelId),
                      ),
                      i = (
                        Array.isArray(n.pendingModelIds) ? n.pendingModelIds : o
                      ).filter((t) => t !== e),
                      a = {
                        ...(n.errors || {}),
                      };
                    return (
                      delete a[e],
                      {
                        ...n,
                        votes: analyzeVotesForStats(r).votes,
                        pendingModelIds: i,
                        errors: a,
                        loading: i.length > 0,
                      }
                    );
                  }),
                );
            } catch (t) {
              isLiveVote() &&
                setChatMessages((n) =>
                  n.map((n) => {
                    if (n.id !== u) return n;
                    let r = (
                      Array.isArray(n.pendingModelIds) ? n.pendingModelIds : o
                    ).filter((t) => t !== e);
                    return {
                      ...n,
                      pendingModelIds: r,
                      errors: {
                        ...(n.errors || {}),
                        [e]:
                          t.detail || t.message || translate(`err_voteFailed`),
                      },
                      loading: r.length > 0,
                    };
                  }),
                );
            }
          }),
        ),
          isLiveVote() && recordUsage(`chat vote`, o.length, 0.01));
      } finally {
        (isLiveVote() &&
          setChatMessages((e) =>
            e.map((e) =>
              e.id === u
                ? {
                    ...e,
                    loading: false,
                    pendingModelIds: [],
                  }
                : e,
            ),
          ),
          isLiveVote() && setChatBusy(false));
        if (discussionAbortRef.current === voteController)
          discussionAbortRef.current = null;
      }
    };
  ((chatActionsRef.current = {
    chatSend: sendChat,
    runChatVoteInChat: runChatVote,
    summarizeCard: summarizeCard,
    latestMsgs: () => chatMessages,
  }),
    React.useEffect(() => {
      if (!pendingLaunch || route !== `chat` || chatBusy) return;
      let e = chatActionsRef.current,
        t =
          typeof pendingLaunch == `object`
            ? pendingLaunch
            : {
                topic: String(pendingLaunch || ``),
              },
        n = String(t.topic || ``).trim();
      if ((setPendingLaunch(null), n)) {
        if (t.mode === `vote` && t.answerType !== `open`) {
          e.runChatVoteInChat?.({
            topic: n,
            models: normalizeChatModels(t.models) || chatModels,
            options: Array.isArray(t.options) ? t.options : [],
            context: `Host: ${n}`,
            addUserMessage: true,
          });
          return;
        }
        e.chatSend?.(n, {
          models: normalizeChatModels(t.models) || chatModels,
          mode: `roundtable`,
          discussionMode: t.mode === `vote` ? `independent` : `debate_auto`,
        });
      }
    }, [pendingLaunch, route, chatBusy, chatModels]));
  let reorderChatModels = (e, t) => {
      !e ||
        !t ||
        e === t ||
        setChatModels((n) => {
          let r = [...n],
            i = r.indexOf(e),
            a = r.indexOf(t);
          return i === -1 || a === -1
            ? n
            : (r.splice(i, 1), r.splice(a, 0, e), r);
        });
    },
    submitChat = () => {
      if (!chatBusy)
        if (discussionMode === `vote_yesno`) {
          let e = chatModels.filter((e) => !isModelDisabled(e)),
            t = chatInput.trim() || currentChatTopic();
          (setChatInput(``),
            runChatVote({
              topic: t,
              models: e,
              context: chatTranscript(),
              options: [`YES`, `NO`],
              addUserMessage: !!chatInput.trim(),
            }),
            setDiscussionMode(`discussion`));
        } else if (discussionMode === `vote_custom`) {
          let e = (Array.isArray(chatVoteOptions) ? chatVoteOptions : [])
            .map((s) => s.trim())
            .filter(Boolean);
          if (e.length < 2) return;
          let t = chatModels.filter((e) => !isModelDisabled(e)),
            n = chatInput.trim() || currentChatTopic();
          (setChatInput(``),
            setChatVoteOptions([``, ``]),
            runChatVote({
              topic: n,
              models: t,
              context: chatTranscript(),
              options: e,
              addUserMessage: !!chatInput.trim(),
            }),
            setDiscussionMode(`discussion`));
        } else sendChat();
    },
    renderSummaryCard = (card) => (
      <SummaryCard
        key={card.id}
        card={card}
        lang={lang}
        onRegenerate={summarizeCard}
      />
    ),
    renderVoteCard = (card) => (
      <PollCard key={card.id} card={card} lang={lang} modelFor={chatModel} />
    ),
    renderChat = () => {
      let e = modelCatalog,
        t = chatModels.filter((e) => !isModelDisabled(e)),
        r = chatModelSearch.trim().toLowerCase(),
        i = e.filter((e) =>
          `${e.name} ${e.company || ``} ${e.id}`.toLowerCase().includes(r),
        ),
        a = () => {
          (setChatModelSearch(``), setChatPickerOpen(false));
        },
        o = (e) => {
          if (!(!e || isModelDisabled(e.id))) {
            if (chatMode === `single`) {
              (setChatModels([e.id]), a());
              return;
            }
            toggleChatModel(e.id);
          }
        },
        s = chatSessions.slice().sort((e, t) => t.updatedAt - e.updatedAt),
        c = (e) => e.title || chatTitle(e.msgs) || translate(`chatUntitled`),
        l = (e) => {
          let t = [...(e.msgs || [])]
            .reverse()
            .find((e) => String(e.content || ``).trim());
          return t
            ? String(t.content || ``)
                .replace(/\s+/g, ` `)
                .slice(0, 72)
            : translate(`chatEmptyTitle`);
        };
      return (
        <div className={`rt-app`}>
          <main className={`rt-chat-app-shell`}>
            <div className="rt-run-toolbar" role="status">
              {chatBusy ? (
                <>
                  <span>
                    {lang === "zh"
                      ? "讨论进行中 · 可随时停止"
                      : "Discussion running · you can stop at any time"}
                  </span>
                  <button type="button" onClick={stopDiscussion}>
                    {lang === "zh" ? "停止" : "Stop"}
                  </button>
                </>
              ) : (
                <span>
                  {lang === "zh"
                    ? "讨论、投票和共识均为模型输出，请结合证据判断。"
                    : "Discussions, votes and agreement reflect model outputs; check the evidence."}
                </span>
              )}
            </div>
            <div
              className={`rt-chat-layout ${chatModelsOpen ? `is-mobile-open` : ``}${_sh ? ` is-side-hidden` : ``}`}
            >
              <aside
                className={`rt-chat-sidebar`}
                aria-label={translate(`chatHistoryTitle`)}
              >
                <div className={`rt-chat-sidebar-head`}>
                  <button
                    type={`button`}
                    className={`rt-chat-sidebar-brand`}
                    onClick={() => navigate(`home`)}
                    aria-label={`ChatOOP AI Roundtable home`}
                  >
                    <span className={`rt-chat-sidebar-mark`}>
                      <img
                        src={`/chatoop-logo-mark.png`}
                        alt={`ChatOOP AI Roundtable`}
                        style={{
                          width: `34px`,
                          height: `34px`,
                          objectFit: `contain`,
                          display: `block`,
                        }}
                      />
                    </span>
                    <span>{`ChatOOP AI Roundtable`}</span>
                  </button>
                  <button
                    type={`button`}
                    className={`rt-chat-sidebar-toggle`}
                    onClick={() => _setSH(true)}
                    aria-label={`Close sidebar`}
                  >
                    <svg
                      xmlns={`http://www.w3.org/2000/svg`}
                      width={16}
                      height={16}
                      viewBox={`0 0 16 16`}
                      fill={`none`}
                      stroke={`currentColor`}
                      strokeWidth={1.5}
                      strokeLinecap={`round`}
                      strokeLinejoin={`round`}
                    >
                      <rect x={1} y={1} width={14} height={14} rx={2} />
                      <line x1={5} y1={1} x2={5} y2={15} />
                    </svg>
                  </button>
                </div>
                <button
                  type={`button`}
                  className={`rt-chat-new-button`}
                  onClick={newChat}
                >
                  <span>{`+`}</span>
                  <span>{translate(`chatNew`)}</span>
                </button>
                <div className={`rt-chat-session-list`}>
                  {s.length === 0 && (
                    <div className={`rt-chat-session-empty`}>
                      {translate(`chatHistoryEmpty`)}
                    </div>
                  )}
                  {s.map((e) => (
                    <button
                      type={`button`}
                      className={`rt-chat-session ${e.id === activeChatId ? `is-active` : ``}`}
                      onClick={() => openChat(e.id)}
                      key={e.id}
                    >
                      <span className={`rt-chat-session-title`}>{c(e)}</span>
                      <span className={`rt-chat-session-meta`}>
                        {e.mode === `single`
                          ? translate(`chatModeChat`)
                          : translate(`chatModeRoundtable`)}
                        {` · `}
                        {new Date(e.updatedAt).toLocaleDateString()}
                      </span>
                      <span className={`rt-chat-session-snippet`}>{l(e)}</span>
                      <span
                        role={`button`}
                        tabIndex={0}
                        className={`rt-chat-session-delete`}
                        title={translate(`chatDelete`)}
                        aria-label={translate(`chatDelete`)}
                        onClick={(t) => {
                          (t.stopPropagation(), deleteChat(e.id));
                        }}
                        onKeyDown={(t) => {
                          (t.key === `Enter` || t.key === ` `) &&
                            (t.preventDefault(),
                            t.stopPropagation(),
                            deleteChat(e.id));
                        }}
                      >
                        <svg
                          xmlns={`http://www.w3.org/2000/svg`}
                          width={13}
                          height={13}
                          viewBox={`0 0 24 24`}
                          fill={`none`}
                          stroke={`currentColor`}
                          strokeWidth={2}
                          strokeLinecap={`round`}
                          strokeLinejoin={`round`}
                        >
                          <polyline points={`3 6 5 6 21 6`} />
                          <path
                            d={`M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6`}
                          />
                          <path d={`M10 11v6`} />
                          <path d={`M14 11v6`} />
                          <path d={`M9 6V4h6v2`} />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
                <div className={`rt-chat-sidebar-footer`}>
                  <button
                    type={`button`}
                    className={`rt-chat-switch-link`}
                    onClick={() => navigate(`home`)}
                  >
                    {lang === `zh`
                      ? `切换到 ChatOOP AI Roundtable`
                      : `Switch to ChatOOP AI Roundtable`}
                  </button>
                  <div className={`rt-chat-sidebar-auth`}>
                    {authUser ? (
                      <button
                        type={`button`}
                        className={`rt-primary-button`}
                        onClick={logout}
                      >
                        {translate(`navLogout`)}
                      </button>
                    ) : (
                      <React.Fragment>
                        <button
                          type={`button`}
                          className={`rt-primary-button`}
                          onClick={() => navigate(`signup`)}
                        >
                          {translate(`navSignup`)}
                        </button>
                        <button
                          type={`button`}
                          className={`rt-ghost-button`}
                          onClick={() => navigate(`login`)}
                        >
                          {translate(`navLogin`)}
                        </button>
                      </React.Fragment>
                    )}
                  </div>
                </div>
              </aside>
              <section className={`rt-chat-main fadeUp`}>
                <header className={`rt-chat-topbar`}>
                  <div
                    style={{
                      display: `inline-flex`,
                      alignItems: `center`,
                      gap: `4px`,
                    }}
                  >
                    <button
                      type={`button`}
                      className={`rt-sidebar-open-btn`}
                      onClick={() => _setSH(false)}
                      aria-label={`Open sidebar`}
                    >
                      <svg
                        xmlns={`http://www.w3.org/2000/svg`}
                        width={16}
                        height={16}
                        viewBox={`0 0 16 16`}
                        fill={`none`}
                        stroke={`currentColor`}
                        strokeWidth={1.5}
                        strokeLinecap={`round`}
                        strokeLinejoin={`round`}
                      >
                        <rect x={1} y={1} width={14} height={14} rx={2} />
                        <line x1={5} y1={1} x2={5} y2={15} />
                      </svg>
                    </button>
                    <button
                      type={`button`}
                      className={`rt-chat-mobile-menu`}
                      onClick={() => setChatModelsOpen(true)}
                      aria-label={translate(`chatSidebarToggle`)}
                    >{`☰`}</button>
                  </div>
                  <div className={`rt-chat-top-actions`}>
                    {authUser ? (
                      <React.Fragment>
                        <button
                          type={`button`}
                          className={`rt-ghost-button`}
                          onClick={() => navigate(`account`)}
                        >
                          {translate(`navWallet`)}
                        </button>
                        <button
                          type={`button`}
                          className={`rt-primary-button`}
                          onClick={logout}
                        >
                          {translate(`navLogout`)}
                        </button>
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <button
                          type={`button`}
                          className={`rt-ghost-button`}
                          onClick={() => navigate(`login`)}
                        >
                          {translate(`navLogin`)}
                        </button>
                        <button
                          type={`button`}
                          className={`rt-primary-button`}
                          onClick={() => navigate(`signup`)}
                        >
                          {translate(`navSignup`)}
                        </button>
                      </React.Fragment>
                    )}
                  </div>
                </header>
                <div className={`rt-chat`}>
                  <div className={`rt-chat-model-picker-details`}>
                    {chatPickerOpen && (
                      <div
                        className={`rt-chat-model-picker-backdrop`}
                        role={`presentation`}
                        onMouseDown={(e) => {
                          e.target === e.currentTarget && a();
                        }}
                      >
                        <section
                          className={`rt-chat-model-picker`}
                          role={`dialog`}
                          aria-modal={`true`}
                          aria-label={translate(`chatModelsLabel`)}
                        >
                          <div className={`rt-chat-model-picker-head`}>
                            <div>
                              <h2>
                                {lang === `zh` ? `选择模型` : `Select models`}
                              </h2>
                              <div className={`rt-chat-model-picker-count`}>
                                {chatMode === `single`
                                  ? lang === `zh`
                                    ? `聊天模式选择 1 个模型`
                                    : `Chat mode uses 1 model`
                                  : `${t.length}/${discussionMode === `vote_yesno` || discussionMode === `vote_custom` ? 8 : 6} ${translate(`chatModelsLabel`)}`}
                              </div>
                            </div>
                            <button
                              type={`button`}
                              className={`rt-ghost-button`}
                              onClick={a}
                            >
                              {lang === `zh` ? `完成` : `Done`}
                            </button>
                          </div>
                          {chatMode === `roundtable` && t.length > 0 && (
                            <div className={`rt-picker-selected-zone`}>
                              <div className={`rt-picker-selected-label`}>
                                {lang === `zh`
                                  ? `已选 · 发言顺序（拖拽调整）`
                                  : `Selected · Speak order (drag to reorder)`}
                              </div>
                              {t.map((e, r) => {
                                let i = chatModel(e),
                                  a = t.length <= 1;
                                return (
                                  <div
                                    className={`rt-picker-selected-row ${draggedModel === e ? `is-dragging` : ``}`}
                                    draggable={true}
                                    onDragStart={() => setDraggedModel(e)}
                                    onDragEnd={() => setDraggedModel(null)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => {
                                      (reorderChatModels(draggedModel, e),
                                        setDraggedModel(null));
                                    }}
                                    key={e}
                                  >
                                    <span
                                      className={`rt-drag-handle`}
                                      aria-hidden={`true`}
                                    >{`⋮⋮`}</span>
                                    <span
                                      className={`rt-picker-selected-index`}
                                    >
                                      {r + 1}
                                    </span>
                                    {renderChatAvatar(i)}
                                    <span className={`rt-picker-selected-name`}>
                                      <span>{i.name}</span>
                                      <span
                                        className={`rt-picker-selected-meta`}
                                      >
                                        {i.company}
                                      </span>
                                    </span>
                                    <button
                                      type={`button`}
                                      className={`rt-picker-selected-remove`}
                                      onClick={() => o(i)}
                                      disabled={a}
                                      title={
                                        a
                                          ? lang === `zh`
                                            ? `至少保留 1 个模型`
                                            : `Minimum 1 model`
                                          : void 0
                                      }
                                      aria-label={
                                        lang === `zh`
                                          ? `移除 ${i.name}`
                                          : `Remove ${i.name}`
                                      }
                                    >{`×`}</button>
                                  </div>
                                );
                              })}
                              <div className={`rt-picker-selected-divider`} />
                            </div>
                          )}
                          <input
                            className={`rt-chat-model-picker-search`}
                            value={chatModelSearch}
                            onChange={(e) => setChatModelSearch(e.target.value)}
                            placeholder={translate(`modelSearchPlaceholder`)}
                            aria-label={translate(`modelSearchPlaceholder`)}
                          />
                          <div className={`rt-chat-model-picker-list`}>
                            {i.length === 0 && (
                              <div className={`rt-chat-model-picker-empty`}>
                                {lang === `zh`
                                  ? `没有匹配的模型`
                                  : `No matching models`}
                              </div>
                            )}
                            {i.map((e) => {
                              let r = chatModels.includes(e.id),
                                i = isModelDisabled(e.id),
                                a =
                                  chatMode === `roundtable` &&
                                  r &&
                                  t.length <= 1,
                                __cap =
                                  discussionMode === `vote_yesno` ||
                                  discussionMode === `vote_custom`
                                    ? 8
                                    : 6,
                                s =
                                  chatMode === `roundtable` &&
                                  !r &&
                                  t.length >= __cap;
                              return (
                                <button
                                  type={`button`}
                                  className={`rt-chat-model-row ${r && !i ? `is-selected` : ``}`}
                                  onClick={() => o(e)}
                                  aria-pressed={r}
                                  disabled={i || a || s}
                                  title={
                                    s
                                      ? lang === `zh`
                                        ? `最多选择 ${__cap} 个模型`
                                        : `Maximum ${__cap} models`
                                      : void 0
                                  }
                                  key={e.id}
                                >
                                  {renderChatAvatar(e)}
                                  <span>
                                    <span className={`rt-chat-model-row-name`}>
                                      {e.name}
                                    </span>
                                    <span className={`rt-chat-model-row-meta`}>
                                      {e.company}
                                      {e.contextLen
                                        ? ` · ${Math.round(e.contextLen / 1e3)}k ctx`
                                        : ``}
                                    </span>
                                  </span>
                                  <span className={`rt-chat-model-row-check`}>
                                    {r
                                      ? lang === `zh`
                                        ? `已选`
                                        : `Selected`
                                      : ``}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className={`rt-chat-model-picker-foot`}>
                            <span>
                              {lang === `zh`
                                ? `输入 @ 可临时点名任意模型，不会改变默认参与者。`
                                : `Use @ in the composer to mention any model for one message.`}
                            </span>
                            <span>
                              {i.length}
                              {`/`}
                              {e.length}
                            </span>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                  <div className={`rt-chat-thread`}>
                    {chatMessages.length === 0 && (
                      <div className={`rt-chat-empty`}>
                        <h2>{translate(`chatEmptyTitle`)}</h2>
                        <p>{translate(`chatEmptySub`)}</p>
                      </div>
                    )}
                    {chatMessages.map((e) => {
                      if (e.role === `user`)
                        return (
                          <div className={`rt-chat-user`} key={e.id}>
                            <div className={`rt-chat-user-stack`}>
                              <div className={`rt-chat-bubble`}>
                                {e.content}
                              </div>
                              {Array.isArray(e.attachments) &&
                                e.attachments.length > 0 && (
                                  <div className={`rt-chat-sent-attachments`}>
                                    {e.attachments.map((e) => (
                                      <span
                                        className={`rt-chat-attachment-chip`}
                                        key={e.id || e.name}
                                      >
                                        {e.name}
                                        {` · `}
                                        {e.sizeLabel}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      if (e.kind === `error`)
                        return (
                          <div className={`rt-chat-assistant`} key={e.id}>
                            <div
                              className={`rt-message-avatar`}
                              style={{
                                "--model-color": `#B42318`,
                              }}
                            >{`!`}</div>
                            <div className={`rt-chat-assistant-body`}>
                              <div className={`rt-chat-error`}>
                                {`⚠ `}
                                {e.content}
                              </div>
                            </div>
                          </div>
                        );
                      if (e.kind === `single`) {
                        let t = chatModel(e.model);
                        return (
                          <div
                            className={`rt-chat-assistant`}
                            style={{
                              "--model-color": t.color,
                            }}
                            key={e.id}
                          >
                            {renderChatAvatar(t)}
                            <div className={`rt-chat-assistant-body`}>
                              <div className={`rt-chat-ans-head`}>
                                <span>{t.name}</span>
                              </div>
                              <div
                                className={`rt-chat-ans-body ${e.streaming && !e.content ? `rt-chat-thinking` : ``}`}
                              >
                                {e.streaming && !e.content
                                  ? translate(`chatThinking`)
                                  : ((l) =>
                                      l.length === 1 ? (
                                        l[0]
                                      ) : l.length > 1 ? (
                                        <React.Fragment>
                                          {l.map((l, i) => (
                                            <p
                                              className={`rt-para`}
                                              style={{
                                                animationDelay: i * 130 + `ms`,
                                              }}
                                              key={i}
                                            >
                                              {l}
                                            </p>
                                          ))}
                                        </React.Fragment>
                                      ) : (
                                        translate(`err_generic`)
                                      ))(
                                      String(e.error || e.content || ``)
                                        .split(`\n`)
                                        .filter((l) => l.trim()),
                                    )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (e.kind === `model`) {
                        let t = chatModel(e.model);
                        return (
                          <div
                            className={`rt-chat-assistant`}
                            style={{
                              "--model-color": t.color,
                            }}
                            key={e.id}
                          >
                            {renderChatAvatar(t)}
                            <div className={`rt-chat-assistant-body`}>
                              <div className={`rt-chat-ans-head`}>
                                <span>{t.name}</span>
                              </div>
                              <div
                                className={`rt-chat-ans-body ${e.streaming && !e.content ? `rt-chat-thinking` : ``}`}
                              >
                                {e.streaming && !e.content ? (
                                  <span
                                    className={[
                                      `rt-thinking-dots`,
                                      /gemini/i.test(e.model)
                                        ? `rt-think-gemini`
                                        : /claude/i.test(e.model)
                                          ? `rt-think-claude`
                                          : /gpt|openai\/o/i.test(e.model)
                                            ? `rt-think-gpt`
                                            : /deepseek/i.test(e.model)
                                              ? `rt-think-deepseek`
                                              : /grok/i.test(e.model)
                                                ? `rt-think-grok`
                                                : `rt-think-default`,
                                    ].join(` `)}
                                  >
                                    <span />
                                    <span />
                                    <span />
                                  </span>
                                ) : (
                                  ((l) =>
                                    l.length === 1 ? (
                                      l[0]
                                    ) : l.length > 1 ? (
                                      <React.Fragment>
                                        {l.map((l, i) => (
                                          <p
                                            className={`rt-para`}
                                            style={{
                                              animationDelay: i * 130 + `ms`,
                                            }}
                                            key={i}
                                          >
                                            {l}
                                          </p>
                                        ))}
                                      </React.Fragment>
                                    ) : (
                                      translate(`err_generic`)
                                    ))(
                                    String(e.error || e.content || ``)
                                      .split(`\n`)
                                      .filter((l) => l.trim()),
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (e.kind === `vote`) return renderVoteCard(e);
                      let t = e.results || [],
                        a = {
                          symbol: `RT`,
                          color: `#111827`,
                        };
                      let _b = renderSummaryCard(e, t);
                      if (!_b) return null;
                      return <div key={e.id}>{_b}</div>;
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  {(() => {
                    let lastRt = [...chatMessages]
                      .reverse()
                      .find(
                        (m) =>
                          m.kind === `roundtable` &&
                          Array.isArray(m.results) &&
                          m.results.length > 1,
                      );
                    if (!lastRt) return null;
                    let lbl = lastRt.summaryLoading
                      ? lang === `zh`
                        ? `正在生成...`
                        : `Generating...`
                      : lang === `zh`
                        ? `生成圆桌摘要`
                        : `Generate Summary`;
                    return (
                      <div className={`rt-global-summary-row`}>
                        <button
                          type={`button`}
                          className={`rt-chat-summary-button rt-global-summary-btn`}
                          onClick={() => summarizeCard(lastRt)}
                          disabled={lastRt.summaryLoading}
                        >
                          {lbl}
                        </button>
                      </div>
                    );
                  })()}
                  <div className={`rt-chat-composer-shell`}>
                    {ao.length > 0 && (
                      <div
                        className={`rt-chat-mention-menu`}
                        role={`listbox`}
                        aria-label={translate(`chatMentionHint`)}
                      >
                        {no.length > 0 && (
                          <div className={`rt-chat-mention-section`}>
                            <div className={`rt-chat-mention-label`}>
                              {lang === `zh`
                                ? `当前参与者`
                                : `Current participants`}
                            </div>
                            {no.map((e) => (
                              <button
                                type={`button`}
                                className={`rt-chat-mention-item`}
                                onClick={() => oo(e)}
                                key={e.id}
                              >
                                {renderModelPillIcon(e, true)}
                                <span>{e.name}</span>
                                <span className={`rt-chat-mention-meta`}>
                                  {e.company}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {io.length > 0 && (
                          <div className={`rt-chat-mention-section`}>
                            <div className={`rt-chat-mention-label`}>
                              {lang === `zh` ? `全部模型` : `All models`}
                            </div>
                            {io.map((e) => (
                              <button
                                type={`button`}
                                className={`rt-chat-mention-item`}
                                onClick={() => oo(e)}
                                key={e.id}
                              >
                                {renderModelPillIcon(e, true)}
                                <span>{e.name}</span>
                                <span className={`rt-chat-mention-meta`}>
                                  {e.company}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {attachments.length > 0 && (
                      <div
                        className={`rt-chat-attachment-row`}
                        aria-label={translate(`chatAttachmentLimit`)}
                      >
                        {attachments.map((e) => (
                          <span
                            className={`rt-chat-attachment-chip`}
                            key={e.id}
                          >
                            {e.name}
                            {` · `}
                            {e.sizeLabel}
                            <button
                              type={`button`}
                              onClick={() => removeAttachment(e.id)}
                              aria-label={translate(`chatAttachmentRemove`)}
                              title={translate(`chatAttachmentRemove`)}
                            >{`×`}</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={`rt-chat-composer`}>
                      <textarea
                        className={`rt-chat-textarea`}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          (e.ctrlKey || e.metaKey) &&
                            e.key === `Enter` &&
                            submitChat();
                        }}
                        placeholder={
                          discussionMode === `vote_yesno`
                            ? lang === `zh`
                              ? `输入投票主题，模型将投赞成/反对…`
                              : `Enter a topic — models will vote Yes or No…`
                            : discussionMode === `vote_custom`
                              ? lang === `zh`
                                ? `输入投票主题…`
                                : `Enter a topic to vote on…`
                              : translate(`chatPlaceholder`)
                        }
                        aria-label={translate(`chatPlaceholder`)}
                        rows={2}
                      />
                      <div
                        className={`rt-chat-composer-meta ${discussionMode === `vote_custom` ? `has-custom-vote` : ``}`}
                      >
                        <div className={`rt-chat-mode-dropdown`}>
                          <button
                            type={`button`}
                            className={`rt-chat-mode-btn`}
                            onClick={() => setModeMenuOpen((e) => !e)}
                            aria-haspopup={`listbox`}
                            aria-expanded={modeMenuOpen}
                          >
                            {discussionMode === `vote_yesno`
                              ? lang === `zh`
                                ? `投票：是/否`
                                : `Vote: Yes / No`
                              : discussionMode === `vote_custom`
                                ? lang === `zh`
                                  ? `投票：自定义`
                                  : `Vote: Custom`
                                : discussionMode === `independent`
                                  ? lang === `zh`
                                    ? `独立`
                                    : `Independent`
                                  : discussionMode === `debate_auto`
                                    ? lang === `zh`
                                      ? `自动辩论`
                                      : `Auto-Debate`
                                    : lang === `zh`
                                      ? `辩论`
                                      : `Debate`}
                            <svg
                              xmlns={`http://www.w3.org/2000/svg`}
                              width={11}
                              height={11}
                              viewBox={`0 0 24 24`}
                              fill={`none`}
                              stroke={`currentColor`}
                              strokeWidth={2.5}
                              strokeLinecap={`round`}
                              strokeLinejoin={`round`}
                              style={{
                                opacity: 0.5,
                                flexShrink: 0,
                              }}
                            >
                              <polyline points={`6 9 12 15 18 9`} />
                            </svg>
                          </button>
                          {modeMenuOpen && t.length >= 2 && (
                            <div
                              className={`rt-chat-mode-listbox`}
                              role={`listbox`}
                              onMouseLeave={() => setModeMenuOpen(false)}
                            >
                              <button
                                role={`option`}
                                aria-selected={discussionMode === `independent`}
                                className={`${discussionMode === `independent` ? `is-selected` : ``} ${chatModels.filter((e) => !isModelDisabled(e)).length < 2 ? `rt-mode-opt-disabled` : ``}`}
                                onClick={() => {
                                  (setDiscussionMode(`independent`),
                                    setModeMenuOpen(false));
                                }}
                              >
                                <span className={`rt-mode-opt-title`}>
                                  {lang === `zh` ? `独立模式` : `Independent`}
                                </span>
                                <span className={`rt-mode-opt-desc`}>
                                  {lang === `zh`
                                    ? `各模型独立回答，互不影响`
                                    : `Each model answers independently`}
                                </span>
                              </button>
                              <button
                                role={`option`}
                                aria-selected={discussionMode === `discussion`}
                                className={`${discussionMode === `discussion` ? `is-selected` : ``} ${chatModels.filter((e) => !isModelDisabled(e)).length < 2 ? `rt-mode-opt-disabled` : ``}`}
                                onClick={() => {
                                  (setDiscussionMode(`discussion`),
                                    setModeMenuOpen(false));
                                }}
                              >
                                <span className={`rt-mode-opt-title`}>
                                  {lang === `zh` ? `辩论模式` : `Debate`}
                                </span>
                                <span className={`rt-mode-opt-desc`}>
                                  {lang === `zh`
                                    ? `模型互相回应讨论`
                                    : `Models build on each other`}
                                </span>
                              </button>
                              <button
                                role={`option`}
                                aria-selected={discussionMode === `debate_auto`}
                                className={`${discussionMode === `debate_auto` ? `is-selected` : ``} ${chatModels.filter((e) => !isModelDisabled(e)).length < 2 ? `rt-mode-opt-disabled` : ``}`}
                                onClick={() => {
                                  (setDiscussionMode(`debate_auto`),
                                    setModeMenuOpen(false));
                                }}
                              >
                                <span className={`rt-mode-opt-title`}>
                                  {lang === `zh` ? `自动辩论` : `Auto-Debate`}
                                </span>
                                <span className={`rt-mode-opt-desc`}>
                                  {lang === `zh`
                                    ? `最多 3–6 轮，可按一致性评估提前结束`
                                    : `Models auto-debate until they converge`}
                                </span>
                              </button>
                              <div className={`rt-mode-separator`} />
                              <button
                                role={`option`}
                                aria-selected={discussionMode === `vote_yesno`}
                                className={
                                  discussionMode === `vote_yesno`
                                    ? `is-selected`
                                    : ``
                                }
                                onClick={() => {
                                  (setDiscussionMode(`vote_yesno`),
                                    setChatMode(`roundtable`),
                                    setChatModels(
                                      (e) =>
                                        normalizeMeetingModels(e) ||
                                        preferredModelIds(),
                                    ),
                                    setModeMenuOpen(false));
                                }}
                              >
                                <span className={`rt-mode-opt-title`}>
                                  {lang === `zh`
                                    ? `投票：是/否`
                                    : `Vote: Yes / No`}
                                </span>
                                <span className={`rt-mode-opt-desc`}>
                                  {lang === `zh`
                                    ? `每个模型投赞成或反对`
                                    : `Each model picks Yes or No`}
                                </span>
                              </button>
                              <button
                                role={`option`}
                                aria-selected={discussionMode === `vote_custom`}
                                className={
                                  discussionMode === `vote_custom`
                                    ? `is-selected`
                                    : ``
                                }
                                onClick={() => {
                                  (setDiscussionMode(`vote_custom`),
                                    setChatMode(`roundtable`),
                                    setChatModels(
                                      (e) =>
                                        normalizeMeetingModels(e) ||
                                        preferredModelIds(),
                                    ),
                                    setModeMenuOpen(false));
                                }}
                              >
                                <span className={`rt-mode-opt-title`}>
                                  {lang === `zh`
                                    ? `投票：自定义`
                                    : `Vote: Custom options`}
                                </span>
                                <span className={`rt-mode-opt-desc`}>
                                  {lang === `zh`
                                    ? `定义 2–6 个选项`
                                    : `Define 2–6 options to vote on`}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                        {discussionMode === `vote_custom` && (
                          <div className={`rt-chat-custom-vote-wrapper`}>
                            <div className={`rt-chat-custom-vote-title`}>
                              {translate(`customOptionsLabel`)}
                            </div>
                            <div className={`rt-chat-custom-vote-grid`}>
                              {(Array.isArray(chatVoteOptions)
                                ? chatVoteOptions
                                : []
                              ).map((val, idx) => {
                                let letter = [`A`, `B`, `C`, `D`, `E`, `F`][
                                  idx
                                ];
                                return (
                                  <div
                                    className={`rt-chat-custom-vote-cell`}
                                    key={idx}
                                  >
                                    <span
                                      className={`rt-chat-custom-vote-label`}
                                    >
                                      {letter + `:`}
                                    </span>
                                    <input
                                      className={`rt-chat-custom-vote-field`}
                                      value={val}
                                      onChange={(ev) => {
                                        let a = [
                                          ...(Array.isArray(chatVoteOptions)
                                            ? chatVoteOptions
                                            : []),
                                        ];
                                        a[idx] = ev.target.value;
                                        setChatVoteOptions(a);
                                      }}
                                      placeholder={`${translate(`customOptionsOptionPlaceholder`)} ${letter}`}
                                      aria-label={`${translate(`customOptionsOptionPlaceholder`)} ${letter}`}
                                    />
                                    {(Array.isArray(chatVoteOptions)
                                      ? chatVoteOptions
                                      : []
                                    ).length > 2 && (
                                      <button
                                        type={`button`}
                                        className={`rt-chat-custom-vote-del`}
                                        onClick={() => {
                                          let a = [
                                            ...(Array.isArray(chatVoteOptions)
                                              ? chatVoteOptions
                                              : []),
                                          ];
                                          a.splice(idx, 1);
                                          setChatVoteOptions(a);
                                        }}
                                        aria-label={`Remove option ${letter}`}
                                      >{`x`}</button>
                                    )}
                                  </div>
                                );
                              })}
                              {(Array.isArray(chatVoteOptions)
                                ? chatVoteOptions
                                : []
                              ).length < 6 && (
                                <button
                                  type={`button`}
                                  className={`rt-chat-custom-vote-add`}
                                  onClick={() =>
                                    setChatVoteOptions([
                                      ...(Array.isArray(chatVoteOptions)
                                        ? chatVoteOptions
                                        : []),
                                      ``,
                                    ])
                                  }
                                >
                                  {translate(`customOptionsAdd`)}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        <button
                          type={`button`}
                          className={`rt-chat-composer-models`}
                          onClick={() => setChatPickerOpen(true)}
                          style={{
                            marginLeft: `auto`,
                          }}
                        >
                          {t.length === 1 ? (
                            <React.Fragment>
                              {renderChatAvatar(
                                chatModel(t[0]),
                                `rt-mode-btn-avatar`,
                              )}
                              <span>{chatModel(t[0])?.name || `Model`}</span>
                            </React.Fragment>
                          ) : (
                            <React.Fragment>
                              <span
                                className={`rt-model-count-badge`}
                                aria-hidden={`true`}
                              >
                                {t.length}
                              </span>
                              <span>{lang === `zh` ? `模型` : `models`}</span>
                            </React.Fragment>
                          )}
                          <svg
                            xmlns={`http://www.w3.org/2000/svg`}
                            width={11}
                            height={11}
                            viewBox={`0 0 24 24`}
                            fill={`none`}
                            stroke={`currentColor`}
                            strokeWidth={2.5}
                            strokeLinecap={`round`}
                            strokeLinejoin={`round`}
                            style={{
                              opacity: 0.5,
                              flexShrink: 0,
                            }}
                          >
                            <polyline points={`6 9 12 15 18 9`} />
                          </svg>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type={`file`}
                        multiple={true}
                        className={`rt-chat-file-input`}
                        onChange={(e) => attachFiles(e.target.files)}
                      />
                      <button
                        type={`button`}
                        className={`rt-submit-arrow`}
                        onClick={submitChat}
                        disabled={
                          chatBusy ||
                          (!chatInput.trim() && discussionMode === `discussion`)
                        }
                        aria-label={translate(`chatSend`)}
                        title={translate(`chatSend`)}
                      >{`→`}</button>
                    </div>
                  </div>
                  <p className={`rt-chat-disclaimer`}>
                    {translate(`chatNaturalHint`)}
                    {` `}
                    {translate(`chatDisclaimer`)}
                  </p>
                </div>
              </section>
            </div>
          </main>
        </div>
      );
    },
    renderDiscussionDetail = () => (
      <div className="rt-app">
        {renderNavigation()}
        <main className="rt-shell">
          <section className="rt-account-page">
            <button
              className="rt-ghost-button"
              onClick={() => navigate("history")}
            >
              {lang === "zh" ? "← 公开历史" : "← Public history"}
            </button>
            {detailLoading ? (
              <p role="status">{lang === "zh" ? "正在加载…" : "Loading…"}</p>
            ) : detailError ? (
              <p role="alert">{detailError.message}</p>
            ) : discussionDetail ? (
              <>
                <h1 className="rt-detail-question">
                  {discussionDetail.question}
                </h1>
                {discussionDetail.votes?.length ? (
                  <PollCard
                    card={{
                      ...discussionDetail,
                      topic: discussionDetail.question,
                      options: discussionDetail.voteOptions,
                      models: discussionDetail.votes.map(
                        (v) => v.modelId || v.modelName,
                      ),
                      publicUrl:
                        discussionDetail.publicUrl ||
                        routePath(
                          "question",
                          discussionDetail.slug || discussionDetail.id,
                        ),
                    }}
                    lang={lang}
                    modelFor={chatModel}
                  />
                ) : (
                  <section className="rt-account-section">
                    <h2>{lang === "zh" ? "最终总结" : "Final summary"}</h2>
                    <div className="rt-summary-prose">
                      {discussionDetail.summary ||
                        (lang === "zh"
                          ? "此记录没有总结。"
                          : "This record has no summary.")}
                    </div>
                    <button
                      className="rt-button"
                      onClick={() =>
                        downloadMarkdown(
                          "chatoop-public-discussion.md",
                          "# " +
                            discussionDetail.question +
                            "\n\n" +
                            (discussionDetail.summary || "") +
                            "\n\n" +
                            (discussionDetail.transcript || [])
                              .map(
                                (m) =>
                                  "## " +
                                  (m.modelName || m.modelId || m.type) +
                                  " · " +
                                  (m.round || 1) +
                                  "\n\n" +
                                  (m.content || ""),
                              )
                              .join("\n\n"),
                        )
                      }
                    >
                      {lang === "zh" ? "导出 Markdown" : "Export Markdown"}
                    </button>
                  </section>
                )}
                <section className="rt-account-section">
                  <h2>{lang === "zh" ? "讨论记录" : "Discussion record"}</h2>
                  {(discussionDetail.transcript || []).map((m, index) => (
                    <article className="rt-public-turn" key={index}>
                      <strong>
                        {m.modelName || m.modelId || m.type} ·{" "}
                        {lang === "zh"
                          ? "第 " + (m.round || 1) + " 轮"
                          : "Round " + (m.round || 1)}
                      </strong>
                      <p>{m.content || ""}</p>
                    </article>
                  ))}
                </section>
              </>
            ) : null}
          </section>
        </main>
      </div>
    ),
    renderStats = () => {
      let e = stats || {},
        t =
          e.totalSessions?.window ??
          e.totalSessions?.all ??
          e.sessionCount ??
          0,
        n = e.responseCount ?? 0,
        r = (e) =>
          Number(
            e?.consensusRate ??
              e?.winRate ??
              e?.keptRate ??
              e?.flipRate ??
              e?.flips ??
              e?.count ??
              0,
          ) || 0,
        i = (e) =>
          e?.consensusRate == null
            ? e?.winRate == null
              ? e?.keptRate == null
                ? e?.flipRate == null
                  ? e?.flips == null
                    ? (e?.count ?? 0)
                    : e.flips
                  : `${e.flipRate}%`
                : `${e.keptRate}%`
              : `${e.winRate}%`
            : `${e.consensusRate}%`,
        a = (e, t = `label`) => {
          let n = (Array.isArray(e) ? e : []).slice(0, 10),
            a = Math.max(1, ...n.map(r));
          return n.length ? (
            <div className={`rt-stats-bars`}>
              {n.map((e, n) => {
                let o = e.model || e[t] || e.label || `—`,
                  s = r(e),
                  c = Math.max(4, Math.round((s / a) * 100));
                return (
                  <div className={`rt-stat-row`} key={`${o}-${n}`}>
                    <div className={`rt-stat-row-head`}>
                      <span className={`rt-stat-row-label`}>
                        {n + 1}
                        {`. `}
                        {o}
                      </span>
                      <strong className={`rt-stat-row-value`}>{i(e)}</strong>
                    </div>
                    <div className={`rt-stat-bar-track`} aria-hidden={`true`}>
                      <div
                        className={`rt-stat-bar-fill`}
                        style={{
                          width: `${c}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`rt-stats-empty`}>{`—`}</div>
          );
        },
        o = e.highlights || {},
        s = e.mostInfluentialModels?.[0],
        c = e.conviction?.[0];
      return (
        <div className={`rt-app`}>
          {renderNavigation()}
          <main className={`rt-shell`}>
            <section className={`rt-stats fadeUp`}>
              <h1 className={`rt-hist-title`}>{translate(`statsTitle`)}</h1>
              <p className={`rt-detail-muted`}>{translate(`statsSub`)}</p>
              <div className={`rt-segmented`} aria-label={`Stats window`}>
                {[
                  [`all`, `statsWindowAll`],
                  [`7d`, `statsWindow7d`],
                  [`24h`, `statsWindow24h`],
                ].map(([e, t]) => (
                  <button
                    type={`button`}
                    className={`rt-segment ${statsWindow === e ? `is-active` : ``}`}
                    onClick={() => setStatsWindow(e)}
                    aria-pressed={statsWindow === e}
                    key={e}
                  >
                    {translate(t)}
                  </button>
                ))}
              </div>
              {statsLoading && (
                <div className={`rt-hist-status`}>{translate(`loading`)}</div>
              )}
              {!statsLoading && statsError && (
                <div className={`rt-hist-status`}>
                  {statsError.detail || translate(`err_generic`)}
                </div>
              )}
              {!statsLoading && (
                <React.Fragment>
                  <div className={`rt-stats-hero`}>
                    <div className={`rt-home-stat`}>
                      <strong>{t}</strong>
                      <span>{translate(`statsSessions`)}</span>
                    </div>
                    <div className={`rt-home-stat`}>
                      <strong>{n}</strong>
                      <span>{translate(`statsResponses`)}</span>
                    </div>
                    <div className={`rt-home-stat`}>
                      <strong>{modelCatalog.length}</strong>
                      <span>{translate(`statAvailableModels`)}</span>
                    </div>
                  </div>
                  <div className={`rt-stats-hero`}>
                    <div className={`rt-home-stat`}>
                      <strong>{o.topMode || `—`}</strong>
                      <span>{translate(`statsTopMode`)}</span>
                    </div>
                    <div className={`rt-home-stat`}>
                      <strong>{s?.model || `—`}</strong>
                      <span>{translate(`statsTopInfluential`)}</span>
                    </div>
                    <div className={`rt-home-stat`}>
                      <strong>
                        {c?.keptRate == null ? `—` : `${c.keptRate}%`}
                      </strong>
                      <span>{translate(`statsHighestConviction`)}</span>
                    </div>
                  </div>
                  <div className={`rt-stats-hero`}>
                    <div className={`rt-home-stat`}>
                      <strong>{o.topCategory || `—`}</strong>
                      <span>{translate(`statsTopCategory`)}</span>
                    </div>
                    <div className={`rt-home-stat`}>
                      <strong>{o.mostUsedModel || `—`}</strong>
                      <span>{translate(`statsMostUsedModel`)}</span>
                    </div>
                    <div className={`rt-home-stat`}>
                      <strong>{o.topLanguage || `—`}</strong>
                      <span>{translate(`statsTopLanguage`)}</span>
                    </div>
                  </div>
                  {e.generatedAt && (
                    <p className={`rt-detail-muted`}>
                      {translate(`statsGenerated`, {
                        time: new Date(e.generatedAt).toLocaleString(),
                      })}
                    </p>
                  )}
                  <div className={`rt-stats-grid`}>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsModels`)}</h2>
                      {a(e.modelUsage, `model`)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsCategories`)}</h2>
                      {a(e.categories)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsLanguages`)}</h2>
                      {a(e.languages)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsModes`)}</h2>
                      {a(e.modes)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsConsensus`)}</h2>
                      {a(e.consensusOutcomes)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsCategoryConsensus`)}</h2>
                      {a(e.categoryConsensus)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsInfluential`)}</h2>
                      {a(e.mostInfluentialModels, `model`)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsConviction`)}</h2>
                      {a(e.conviction, `model`)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsPersuadable`)}</h2>
                      {a(e.mostPersuadable, `model`)}
                    </section>
                    <section className={`rt-stats-card`}>
                      <h2>{translate(`statsWinRate`)}</h2>
                      {a(e.winRate, `model`)}
                    </section>
                  </div>
                  <p className={`rt-detail-muted`}>
                    {translate(`statsSkippedDebate`, {
                      n: e.skippedDebateShare || 0,
                    })}
                  </p>
                  <section className={`rt-stats-cta`}>
                    <h2>{translate(`statsCtaTitle`)}</h2>
                    <p>{translate(`statsCtaSub`)}</p>
                    <div className={`rt-stats-cta-actions`}>
                      <button
                        type={`button`}
                        className={`rt-primary-button`}
                        onClick={() => navigate(`home`)}
                      >
                        {translate(`statsCtaRoundtable`)}
                      </button>
                      <button
                        type={`button`}
                        className={`rt-button`}
                        onClick={() => navigate(`history`)}
                      >
                        {translate(`statsCtaHistory`)}
                      </button>
                      <button
                        type={`button`}
                        className={`rt-ghost-button`}
                        onClick={() => navigate(`chat`)}
                      >
                        {translate(`statsCtaChat`)}
                      </button>
                    </div>
                  </section>
                </React.Fragment>
              )}
            </section>
          </main>
        </div>
      );
    },
    renderAbout = () => (
      <div className="rt-app">
        {renderNavigation()}
        <main className="rt-shell">
          <section className="rt-account-page">
            <p className="rt-detail-kicker">ChatOOP AI Roundtable</p>
            <h1>
              {lang === "zh"
                ? "让多个模型参与同一场讨论"
                : "Bring different models into one discussion"}
            </h1>
            <section className="rt-account-section">
              <p>
                {lang === "zh"
                  ? "你是主持人：输入问题，选择参与者，比较独立回答，推进讨论或自动辩论，再查看投票、共识和剩余分歧。"
                  : "You host the session: ask a question, choose participants, compare independent answers, continue a discussion or automatic debate, then inspect votes, agreement and remaining differences."}
              </p>
              <p>
                {lang === "zh"
                  ? "讨论结果是模型发言，不是事实核验。会话保存在当前浏览器，公开分享需要明确确认。"
                  : "Results reflect model statements, not factual verification. Conversations stay in this browser; publication is explicit."}
              </p>
              <p>
                {lang === "zh"
                  ? "支持 OpenRouter 与可配置的兼容接口。账户和管理功能取决于当前实例配置；本版不收款，也不发送找回密码邮件。"
                  : "Supports OpenRouter and configurable compatible providers. Account and admin features depend on this instance’s setup. This edition does not collect payments or send password-reset email."}
              </p>
              <a
                className="rt-button"
                href="https://github.com/zhenzhang14-tech/chatoop-ai-roundtable#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                {lang === "zh"
                  ? "完整中英文功能与使用说明"
                  : "Full bilingual features and usage guide"}
              </a>
            </section>
          </section>
        </main>
      </div>
    ),
    renderAuth = (e) => {
      let t = e === `signup`;
      return (
        <div className={`rt-app`}>
          {renderNavigation()}
          <main className={`rt-shell`}>
            <section className={`rt-account-page fadeUp`}>
              <div className={`rt-account-head`}>
                <div>
                  <div
                    className={`rt-detail-kicker`}
                  >{`ChatOOP AI Roundtable`}</div>
                  <h1 className={`rt-account-title`}>
                    {translate(t ? `navSignup` : `navLogin`)}
                  </h1>
                  <p className={`rt-account-sub`}>
                    {translate(t ? `authSignupNote` : `authDemoNote`)}
                  </p>
                </div>
              </div>
              <div className={`rt-auth-grid`}>
                <div className={`rt-account-section rt-auth-form`}>
                  <label className={`rt-label`} htmlFor={`auth-email`}>
                    {translate(`authEmail`)}
                  </label>
                  <input
                    id={`auth-email`}
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    autoComplete={`email`}
                  />
                  <label className={`rt-label`} htmlFor={`auth-password`}>
                    {translate(`authPassword`)}
                  </label>
                  <input
                    id={`auth-password`}
                    type={`password`}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    autoComplete={t ? `new-password` : `current-password`}
                  />
                  {authMessage && (
                    <div className={`rt-error`}>
                      <div>{authMessage}</div>
                    </div>
                  )}
                  <button
                    type={`button`}
                    className={`rt-primary-button`}
                    onClick={t ? signup : login}
                    disabled={authBusy}
                  >
                    {translate(t ? `navSignup` : `navLogin`)}
                  </button>
                  {!t && null}
                </div>
                <aside className={`rt-demo-card`}>
                  <strong>{translate(`authDemoNote`)}</strong>
                  <p className={`rt-detail-muted`}>
                    {translate(`authSecureNote`)}
                  </p>
                  <button
                    type={`button`}
                    className={`rt-button`}
                    onClick={() => navigate(t ? `login` : `signup`)}
                  >
                    {translate(t ? `navLogin` : `navSignup`)}
                  </button>
                </aside>
              </div>
            </section>
          </main>
        </div>
      );
    },
    renderDashboard = () => (
      <div className="rt-app">
        {renderNavigation()}
        <SettingsPanel
          lang={lang}
          onLanguage={setLang}
          authUser={authUser}
          onUser={setAuthUser}
          models={modelCatalog}
          rounds={autoRoundLimit}
          onRounds={(value) => {
            setAutoRoundLimit(value);
            setDefaultsSaved(Date.now());
          }}
          sessions={chatSessions}
          onOpen={(id) => {
            openChat(id);
            navigate("chat");
          }}
          onDelete={deleteChat}
          onExport={() =>
            downloadMarkdown(
              "chatoop-conversations.md",
              chatSessions
                .map(
                  (session) =>
                    "# " +
                    (session.title || "Conversation") +
                    "\n\n" +
                    (session.msgs || [])
                      .map(
                        (m) =>
                          (m.role === "user" ? "Host" : m.model || "Summary") +
                          ": " +
                          (m.content || m.summary || ""),
                      )
                      .join("\n\n"),
                )
                .join("\n\n---\n\n"),
            )
          }
          onBack={() => navigate("chat")}
        />
      </div>
    ),
    renderWallet = () => (
      <div className="rt-app">
        {renderNavigation()}
        <main className="rt-shell">
          <section className="rt-account-page">
            <h1>{lang === "zh" ? "用量记录" : "Usage records"}</h1>
            <p>
              {lang === "zh"
                ? "开源版本不收款、不扣除钱包余额。实际模型费用由你配置的供应商计收。下面是当前浏览器记录的调用概览，不是账单。"
                : "The open-source edition does not collect payments or debit a wallet. Your configured provider bills model usage. The browser records below are a local activity overview, not an invoice."}
            </p>
            <div className="rt-light-list">
              {usageEvents.map((event) => (
                <div className="rt-light-row" key={event.id}>
                  <span>{event.label}</span>
                  <span>
                    {event.modelCount}{" "}
                    {lang === "zh"
                      ? "模型调用（概览）"
                      : "model calls (overview)"}
                  </span>
                  <time>
                    {new Date(event.at).toLocaleString(
                      lang === "zh" ? "zh-CN" : "en",
                    )}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    ),
    reloadAdmin = () => {
      (setAdminLoading(true),
        setAdminError(null),
        adminRegistryAPI()
          .then((e) => {
            (setAdminProviders(e.providers),
              setAdminModels(e.models),
              e.error && setAdminFailure(e.error));
          })
          .catch((e) => setAdminFailure(e))
          .finally(() => setAdminLoading(false)));
    },
    setAdminFailure = (e) => {
      let t = e?.detail || e?.message || ``;
      (setAdminError(e),
        (e?.status === 401 ||
          e?.status === 403 ||
          /Authentication required|Admin access required/i.test(t)) &&
          (setAuthToken(``), setAuthUser(null)));
    },
    saveProvider = async () => {
      try {
        (await saveProviderAPI(providerForm),
          setProviderForm(null),
          reloadAdmin());
      } catch (e) {
        setAdminFailure(e);
      }
    },
    deleteProvider = async (e) => {
      try {
        (await deleteProviderAPI(e), reloadAdmin());
      } catch (e) {
        setAdminFailure(e);
      }
    },
    testProvider = async (e) => {
      setProviderTests((t) => ({
        ...t,
        [e.id]: {
          ok: false,
          error: `…`,
        },
      }));
      let t =
        adminModels.find(
          (t) =>
            t.providerId === e.id &&
            /deepseek\/deepseek-v4-flash|bytedance-seed\/seed-2\.0-mini/i.test(
              t.upstreamModel || ``,
            ),
        )?.upstreamModel ||
        adminModels.find(
          (t) =>
            t.providerId === e.id &&
            t.upstreamModel &&
            !String(t.upstreamModel).startsWith(`~`),
        )?.upstreamModel ||
        adminModels.find((t) => t.providerId === e.id)?.upstreamModel ||
        (/openrouter/i.test(`${e.slug || ``} ${e.name || ``}`)
          ? `deepseek/deepseek-v4-flash`
          : `gpt-4o-mini`);
      try {
        let n = await testProviderAPI(e.id, t);
        setProviderTests((t) => ({
          ...t,
          [e.id]: n,
        }));
      } catch (t) {
        setProviderTests((n) => ({
          ...n,
          [e.id]: {
            ok: false,
            error: t.detail || t.message,
          },
        }));
      }
    },
    [syncResults, setSyncResults] = React.useState({}),
    syncProviderModels = async (e) => {
      setSyncResults((t) => ({
        ...t,
        [e.id]: {
          loading: true,
        },
      }));
      try {
        let t = await syncProviderModelsAPI(e.id);
        (setSyncResults((n) => ({
          ...n,
          [e.id]: {
            done: true,
            synced: t.synced,
            total: t.total,
          },
        })),
          reloadAdmin());
      } catch (t) {
        (setAdminFailure(t),
          setSyncResults((n) => ({
            ...n,
            [e.id]: {
              error: t.detail || t.message,
            },
          })));
      }
    },
    saveModel = async () => {
      try {
        (await saveModelAPI({
          ...modelForm,
          tags: String(modelForm.tags || ``)
            .split(`,`)
            .map((e) => e.trim())
            .filter(Boolean),
        }),
          setModelForm(null),
          reloadAdmin());
      } catch (e) {
        setAdminFailure(e);
      }
    },
    deleteModel = async (e) => {
      try {
        (await deleteModelAPI(e), reloadAdmin());
      } catch (e) {
        setAdminFailure(e);
      }
    },
    renderAdmin = () =>
      authUser?.role === `admin` ? (
        <div className={`rt-app`}>
          {renderNavigation()}
          <main className={`rt-shell`}>
            <section className={`rt-account-page fadeUp`}>
              <div className={`rt-account-head`}>
                <div>
                  <div
                    className={`rt-detail-kicker`}
                  >{`ChatOOP AI Roundtable`}</div>
                  <h1 className={`rt-account-title`}>
                    {translate(`adminTitle`)}
                  </h1>
                  <p className={`rt-account-sub`}>{translate(`adminSub`)}</p>
                </div>
                <div className={`rt-account-actions`}>
                  <button
                    type={`button`}
                    className={`rt-ghost-button`}
                    onClick={() => navigate(`dashboard`)}
                  >
                    {translate(`dashboardTitle`)}
                  </button>
                </div>
              </div>
              <div className={`rt-account-tabs`}>
                {[
                  [`providers`, `adminProviders`],
                  [`models`, `adminModels`],
                ].map(([e, t]) => (
                  <button
                    type={`button`}
                    className={`rt-account-tab ${adminTab === e ? `is-active` : ``}`}
                    onClick={() => setAdminTab(e)}
                    key={e}
                  >
                    {translate(t)}
                  </button>
                ))}
              </div>
              {null}
              {null}
              {adminTab === `providers` && (
                <section className={`rt-account-section`}>
                  <div className={`rt-section-head`}>
                    <h2>{translate(`adminProviders`)}</h2>
                    <button
                      type={`button`}
                      className={`rt-button`}
                      onClick={() =>
                        setProviderForm({
                          name: ``,
                          slug: ``,
                          baseUrl: ``,
                          apiKey: ``,
                          priority: 0,
                          enabled: true,
                        })
                      }
                    >
                      {translate(`adminAddProvider`)}
                    </button>
                  </div>
                  {adminLoading && (
                    <p className={`rt-empty-line`}>{translate(`loading`)}</p>
                  )}
                  {adminError && (
                    <p className={`rt-empty-line`}>
                      {adminError.detail || translate(`err_generic`)}
                    </p>
                  )}
                  {providerForm && (
                    <div
                      className={`rt-admin-form`}
                      style={{
                        display: `flex`,
                        flexDirection: `column`,
                        gap: `8px`,
                        margin: `8px 0 14px`,
                        padding: `14px`,
                        border: `1px solid var(--rt-border)`,
                        borderRadius: `12px`,
                      }}
                    >
                      <input
                        className={`rt-hist-search`}
                        placeholder={translate(`provName`)}
                        value={providerForm.name}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            name: e.target.value,
                          })
                        }
                      />
                      <input
                        className={`rt-hist-search`}
                        placeholder={`slug (openrouter / siliconflow / deepseek …)`}
                        value={providerForm.slug}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            slug: e.target.value,
                          })
                        }
                      />
                      <input
                        className={`rt-hist-search`}
                        placeholder={translate(`provBaseUrl`)}
                        value={providerForm.baseUrl}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            baseUrl: e.target.value,
                          })
                        }
                      />
                      <input
                        className={`rt-hist-search`}
                        type={`password`}
                        placeholder={
                          providerForm.id
                            ? translate(`provKeyKeep`)
                            : translate(`provKey`)
                        }
                        value={providerForm.apiKey}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            apiKey: e.target.value,
                          })
                        }
                        autoComplete={`off`}
                      />
                      <input
                        className={`rt-hist-search`}
                        type={`number`}
                        placeholder={translate(`provPriority`)}
                        value={providerForm.priority}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            priority: Number(e.target.value),
                          })
                        }
                      />
                      <label
                        className={`rt-check`}
                        style={{
                          display: `inline-flex`,
                          alignItems: `center`,
                          gap: `6px`,
                        }}
                      >
                        <input
                          type={`checkbox`}
                          checked={providerForm.enabled}
                          onChange={(e) =>
                            setProviderForm({
                              ...providerForm,
                              enabled: e.target.checked,
                            })
                          }
                        />
                        {` `}
                        {translate(`provEnabled`)}
                      </label>
                      <div className={`rt-inline-actions`}>
                        <button
                          type={`button`}
                          className={`rt-primary-button`}
                          onClick={saveProvider}
                        >
                          {translate(`admSave`)}
                        </button>
                        <button
                          type={`button`}
                          className={`rt-ghost-button`}
                          onClick={() => setProviderForm(null)}
                        >
                          {translate(`admCancel`)}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={`rt-light-list`}>
                    {adminProviders.map((e) => (
                      <div className={`rt-light-row`} key={e.id}>
                        <span className={`rt-row-main`}>
                          <span className={`rt-row-title`}>
                            {e.name}
                            {e.enabled
                              ? ``
                              : ` · ${translate(`adminModelDisabled`)}`}
                          </span>
                          <span className={`rt-row-meta`}>
                            {e.baseUrl}
                            {` · `}
                            {translate(`provKeyMask`)}
                            {`: `}
                            {e.keyMask || `—`}
                            {providerTests[e.id]
                              ? providerTests[e.id].ok
                                ? ` · OK ${providerTests[e.id].latencyMs}ms`
                                : ` · ✗ ${providerTests[e.id].error}`
                              : ``}
                          </span>
                        </span>
                        <span className={`rt-inline-actions`}>
                          <button
                            type={`button`}
                            className={`rt-ghost-button`}
                            onClick={() => testProvider(e)}
                          >
                            {translate(`provTest`)}
                          </button>
                          <button
                            type={`button`}
                            className={`rt-ghost-button`}
                            disabled={syncResults[e.id]?.loading}
                            onClick={() => syncProviderModels(e)}
                          >
                            {syncResults[e.id]?.loading
                              ? `同步中…`
                              : syncResults[e.id]?.done
                                ? `✓ ${syncResults[e.id].synced}个模型`
                                : syncResults[e.id]?.error
                                  ? `同步失败`
                                  : `同步模型`}
                          </button>
                          <button
                            type={`button`}
                            className={`rt-ghost-button`}
                            onClick={async () => {
                              try {
                                (await saveProviderAPI({
                                  id: e.id,
                                  enabled: !e.enabled,
                                }),
                                  reloadAdmin());
                              } catch (t) {
                                setAdminFailure(t);
                              }
                            }}
                          >
                            {e.enabled
                              ? translate(`provDisable`)
                              : translate(`provEnable`)}
                          </button>
                          <button
                            type={`button`}
                            className={`rt-ghost-button`}
                            onClick={() =>
                              setProviderForm({
                                id: e.id,
                                name: e.name,
                                slug: e.slug,
                                baseUrl: e.baseUrl,
                                apiKey: ``,
                                priority: e.priority,
                                enabled: e.enabled,
                              })
                            }
                          >
                            {translate(`admEdit`)}
                          </button>
                          <button
                            type={`button`}
                            className={`rt-ghost-button`}
                            onClick={() => deleteProvider(e.id)}
                          >
                            {translate(`admDelete`)}
                          </button>
                        </span>
                      </div>
                    ))}
                    {!adminLoading && adminProviders.length === 0 && (
                      <p className={`rt-empty-line`}>
                        {translate(`adminNoProviders`)}
                      </p>
                    )}
                  </div>
                </section>
              )}
              {null}
              {null}
              {adminTab === `models` && (
                <section className={`rt-account-section`}>
                  <div className={`rt-section-head`}>
                    <h2>{translate(`adminModels`)}</h2>
                    <span className={`rt-row-value`}>
                      {modelCatalog.length}
                    </span>
                  </div>
                  <div className={`rt-light-list`}>
                    {modelCatalog.map((e) => (
                      <div className={`rt-light-row`} key={e.id}>
                        <span className={`rt-row-main`}>
                          <span className={`rt-row-title`}>{e.name}</span>
                          <span className={`rt-row-meta`}>
                            {e.company}
                            {` · `}
                            {isModelDisabled(e.id)
                              ? translate(`adminModelDisabled`)
                              : translate(`adminModelEnabled`)}
                          </span>
                        </span>
                        <button
                          type={`button`}
                          className={`rt-ghost-button`}
                          onClick={() => toggleDisabledModel(e)}
                        >
                          {isModelDisabled(e.id)
                            ? translate(`adminEnableModel`)
                            : translate(`adminDisableModel`)}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {null}
              {null}
              {null}
              {null}
            </section>
          </main>
        </div>
      ) : (
        <div className={`rt-app`}>
          {renderNavigation()}
          <main className={`rt-shell`}>
            <section className={`rt-account-page fadeUp`}>
              <div className={`rt-account-head`}>
                <div>
                  <div
                    className={`rt-detail-kicker`}
                  >{`ChatOOP AI Roundtable`}</div>
                  <h1 className={`rt-account-title`}>
                    {translate(`adminTitle`)}
                  </h1>
                  <p className={`rt-account-sub`}>{translate(`adminDenied`)}</p>
                </div>
              </div>
              <section className={`rt-account-section`}>
                <button
                  type={`button`}
                  className={`rt-primary-button`}
                  onClick={() => navigate(`login`)}
                >
                  {translate(`navLogin`)}
                </button>
              </section>
            </section>
          </main>
        </div>
      ),
    renderRoute = () => {
      if (route === `history`) return renderHistory();
      if (route === `chat`) return renderChat();
      if (route === `question`) return renderDiscussionDetail();
      if (route === `stats`) return renderStats();
      if (route === `about`) return renderAbout();
      if (route === `login`) return renderAuth(`login`);
      if (route === `signup`) return renderAuth(`signup`);
      if (route === `dashboard`) return JSXRuntime.jsx(renderDashboard, {});
      if (route === `wallet`) return renderWallet();
      if (route === `admin`) return renderAdmin();
      let e = {
        history: translate(`navPastRoundtables`),
        chat: translate(`navChat`),
        stats: translate(`navStats`),
        about: translate(`navAbout`),
        login: translate(`navLogin`),
        signup: translate(`navSignup`),
      };
      return (
        <div className={`rt-app`}>
          {renderNavigation()}
          <main className={`rt-shell`}>
            <section className={`rt-page fadeUp`}>
              <h1 className={`rt-page-title`}>{e[route] || ``}</h1>
              <div className={`rt-page-card`}>
                <p>{translate(`pageComingSoon`)}</p>
                <button
                  type={`button`}
                  className={`rt-nav-signup`}
                  onClick={() => navigate(`home`, newMeetingAction)}
                >
                  {translate(`navNewRoundtable`)}
                </button>
              </div>
            </section>
          </main>
        </div>
      );
    },
    renderMobileTabs = () => (
      <div
        className={`rt-mobile-tabs`}
        role={`tablist`}
        aria-label={`Workspace sections`}
      >
        {[
          [`room`, `mobileRoom`],
          [`models`, `mobileModels`],
          [`control`, `mobileControl`],
          [`summary`, `mobileSummary`],
        ].map(([e, t]) => (
          <button
            type={`button`}
            className={`rt-tab-button ${mobileTab === e ? `is-active` : ``}`}
            onClick={() => setMobileTab(e)}
            key={e}
          >
            {translate(t)}
          </button>
        ))}
      </div>
    ),
    renderStage = () => (
      <div className={`rt-stage-card`}>
        <div
          className={`rt-status-row`}
          style={{
            justifyContent: `space-between`,
            marginBottom: `var(--rt-space-3)`,
          }}
        >
          <div>
            <div
              className={`rt-label`}
              style={{
                marginBottom: 0,
              }}
            >
              {translate(`stageLabel`)}
            </div>
            <div className={`rt-panel-subtitle`}>{translate(`stageHint`)}</div>
          </div>
          <div
            className={`rt-inline-actions`}
            style={{
              flexWrap: `wrap`,
              justifyContent: `flex-end`,
            }}
          >
            {defaultsSaved && (
              <span className={`rt-status-pill is-live`}>
                {translate(`defaultSaved`)}
              </span>
            )}
            <button
              type={`button`}
              className={`rt-ghost-button`}
              onClick={saveDefaultModels}
            >
              {translate(`saveDefault`)}
            </button>
            <button
              type={`button`}
              className={`rt-ghost-button`}
              onClick={restoreDefaultModels}
            >
              {translate(`restoreDefault`)}
            </button>
          </div>
        </div>
        <div className={`rt-stage-list`}>
          {selectedModels().map((e, t) => (
            <div
              className={`rt-stage-row`}
              style={{
                "--model-color": e.color,
              }}
              key={e.id}
            >
              <span className={`rt-stage-index`}>{t + 1}</span>
              <div className={`rt-model-top`}>
                <span
                  className={`rt-dot`}
                  style={{
                    color: e.color,
                  }}
                />
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div className={`rt-model-name`}>{e.name}</div>
                  <div className={`rt-model-provider`}>
                    {e.company}
                    {` · `}
                    {e.cost}
                    {` · `}
                    {e.tags.join(` · `)}
                  </div>
                </div>
              </div>
              <div className={`rt-inline-actions`}>
                <button
                  type={`button`}
                  className={`rt-mini-button`}
                  title={translate(`moveEarlier`)}
                  aria-label={translate(`moveEarlier`)}
                  disabled={t === 0}
                  onClick={() => moveSelectedModel(e.id, -1)}
                >{`↑`}</button>
                <button
                  type={`button`}
                  className={`rt-mini-button`}
                  title={translate(`moveLater`)}
                  aria-label={translate(`moveLater`)}
                  disabled={t === selected.length - 1}
                  onClick={() => moveSelectedModel(e.id, 1)}
                >{`↓`}</button>
                <button
                  type={`button`}
                  className={`rt-mini-button`}
                  title={translate(`removePanelist`)}
                  aria-label={translate(`removePanelist`)}
                  disabled={selected.length <= 2}
                  onClick={() => removeSelectedModel(e.id)}
                >{`×`}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    renderParticipants = () => (
      <section
        className={`rt-panel rt-models-panel ${mobileTab === `models` ? `is-mobile-active` : ``}`}
      >
        <header className={`rt-panel-header`}>
          <div>
            <h2 className={`rt-panel-title`}>
              {translate(`candidateModelsTitle`)}
            </h2>
            <p className={`rt-panel-subtitle`}>
              {translate(`candidateModelsSub`)}
            </p>
          </div>
          <span className={`rt-status-pill`}>
            {activeModels().length}
            {`/6`}
          </span>
        </header>
        <div className={`rt-panel-body`}>
          <div className={`rt-model-list`}>
            {modelCatalog.map((e) => {
              let t = selected.includes(e.id),
                n = isModelDisabled(e.id),
                r = selected.length > 2;
              return (
                <article
                  className={`rt-model-card ${t && !n ? `is-selected` : ``} ${n ? `is-disabled` : ``}`}
                  style={{
                    "--model-color": e.color,
                  }}
                  key={e.id}
                >
                  <div className={`rt-model-top`}>
                    <div className={`rt-model-avatar`}>{e.symbol}</div>
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div className={`rt-model-name`}>{e.name}</div>
                      <div className={`rt-model-provider`}>{e.company}</div>
                    </div>
                    <span
                      className={`rt-status-pill ${t && !n ? `is-live` : ``}`}
                    >
                      <span className={`rt-dot`} />
                      {translate(
                        n
                          ? `adminModelDisabled`
                          : t
                            ? `statusSelected`
                            : `statusAvailable`,
                      )}
                    </span>
                  </div>
                  <div className={`rt-badge-row`}>
                    <span className={`rt-badge`}>
                      {translate(`costLabel`)}
                      {`: `}
                      {e.cost}
                    </span>
                    {e.tags.map((e) => (
                      <span className={`rt-badge`} key={e}>
                        {e}
                      </span>
                    ))}
                  </div>
                  <button
                    type={`button`}
                    className={t ? `rt-ghost-button` : `rt-button`}
                    onClick={() => toggleModel(e.id)}
                    disabled={n || (t && !r)}
                  >
                    {translate(
                      n
                        ? `adminModelDisabled`
                        : t
                          ? `removeFromStage`
                          : `addToStage`,
                    )}
                  </button>
                </article>
              );
            })}
            {renderStage()}
          </div>
        </div>
      </section>
    ),
    renderMeetingMessage = (e, t) => (
      <div className={`fadeUp`} key={t}>
        {e.type === `host` && (
          <div className={`rt-host-message`}>
            <span className={`rt-host-chip`}>
              {translate(`hostLabel`)}
              {`: `}
              {e.content}
            </span>
          </div>
        )}
        {e.type === `system` && (
          <div
            style={{
              textAlign: `center`,
            }}
          >
            <span className={`rt-system-chip`}>{translate(e.key)}</span>
          </div>
        )}
        {e.type === `model` && (
          <div
            className={`rt-message`}
            style={{
              "--model-color": e.color,
            }}
          >
            <div className={`rt-message-avatar`}>{e.symbol}</div>
            <div className={`rt-message-card`}>
              <div className={`rt-message-head`}>
                <span
                  className={`rt-message-name`}
                  style={{
                    color: e.color,
                  }}
                >
                  {e.modelName}
                </span>
                <span className={`rt-message-time`}>{e.time}</span>
                {e.phase && (
                  <span className={`rt-phase-pill`}>
                    {translate(`phase_${e.phase}`)}
                  </span>
                )}
                {e.fallbackUsed && (
                  <span className={`rt-phase-pill`} title={e.modelUsed || ``}>
                    {translate(`fallbackBadge`)}
                  </span>
                )}
              </div>
              <div className={`rt-message-bubble`}>{e.content}</div>
            </div>
          </div>
        )}
        {e.type === `user` && (
          <div className={`rt-user-message`}>
            <div className={`rt-user-bubble`}>{e.content}</div>
          </div>
        )}
      </div>
    ),
    renderMeetingVotes = () => {
      if (phase !== `voting` && votes.length === 0) return null;
      let e = voteOptions.length
          ? voteOptions
          : Array.from(new Set(votes.map((e) => e.vote).filter(Boolean))),
        t = Array.from(
          new Set(votes.map((e) => e.finalVote || e.vote).filter(Boolean)),
        ),
        n = [
          ...e,
          ...t.filter(
            (t) =>
              !e.some(
                (e) => String(e).toLowerCase() === String(t).toLowerCase(),
              ),
          ),
        ],
        r = n.map((e) => String(e).toUpperCase()),
        o = n.filter((e) => String(e).toUpperCase() !== `INVALID`),
        s = o.map((e) => ({
          label: e,
          count: votes.filter(
            (t) => String(t.vote).toLowerCase() === String(e).toLowerCase(),
          ).length,
        })),
        c =
          yesVotes > noVotes
            ? translate(`inFavor`, {
                a: yesVotes,
                b: noVotes,
              })
            : yesVotes < noVotes
              ? translate(`against`, {
                  a: noVotes,
                  b: yesVotes,
                })
              : o.length === 2 && o.includes(`YES`) && o.includes(`NO`)
                ? translate(`split`)
                : ``;
      return (
        <div className={`rt-summary-box fadeUp`}>
          <div
            className={`rt-status-row`}
            style={{
              justifyContent: `space-between`,
              marginBottom: `var(--rt-space-3)`,
              flexWrap: `wrap`,
            }}
          >
            <div>
              <div
                className={`rt-label`}
                style={{
                  marginBottom: 0,
                }}
              >
                {translate(`voteSummary`)}
              </div>
              <div className={`rt-panel-subtitle`}>
                {translate(`voted`, {
                  n: votes.length,
                  t: participantCount,
                })}
              </div>
            </div>
            {!busy && votes.length === participantCount && c && (
              <span className={`rt-status-pill is-live`}>{c}</span>
            )}
          </div>
          <div
            className={`rt-vote-grid`}
            style={{
              marginBottom: `var(--rt-space-3)`,
            }}
          >
            {s.map((e) => (
              <div className={`rt-vote-stat`} key={e.label}>
                <span className={`rt-panel-subtitle`}>
                  {voteCountLabel(e.label)}
                </span>
                <strong>{e.count}</strong>
              </div>
            ))}
          </div>
          <div className={`rt-control-stack`}>
            {votes.map((e, t) => (
              <div
                className={`rt-vote-card slideLeft`}
                style={{
                  "--model-color": e.color,
                }}
                key={t}
              >
                <div>
                  <div className={`rt-vote-head`}>
                    <span
                      className={`rt-dot`}
                      style={{
                        color: e.color,
                      }}
                    />
                    <span className={`rt-message-name`}>{e.modelName}</span>
                    {e.fallbackUsed && (
                      <span
                        className={`rt-phase-pill`}
                        title={e.modelUsed || ``}
                      >
                        {translate(`fallbackBadge`)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`rt-panel-subtitle`}
                    style={{
                      marginTop: `var(--rt-space-2)`,
                    }}
                  >
                    {translate(`round1VoteLabel`)}
                    {`: `}
                    {e.round1Vote || e.vote}
                    {` → `}
                    {translate(`finalVoteLabel`)}
                    {`: `}
                    {e.finalVote || e.vote}
                    <span className={`rt-hist-dot`}>{` · `}</span>
                    {e.flipped
                      ? translate(`voteChanged`)
                      : translate(`voteHeld`)}
                    {e.onWinningSide != null && (
                      <React.Fragment>
                        <span className={`rt-hist-dot`}>{` · `}</span>
                        {e.onWinningSide
                          ? translate(`voteWinningSide`)
                          : translate(`split`)}
                      </React.Fragment>
                    )}
                  </div>
                  <div
                    className={`rt-panel-subtitle`}
                    style={{
                      marginTop: `var(--rt-space-2)`,
                    }}
                  >
                    {e.reason}
                  </div>
                </div>
                <span className={`rt-status-pill`}>
                  {voteLabel(e.finalVote || e.vote)}
                </span>
              </div>
            ))}
            {busy && phase === `voting` && (
              <div className={`rt-typing`}>
                <span className={`rt-dots`}>
                  <span />
                  <span />
                  <span />
                </span>
                <span>{translate(`thinking`)}</span>
              </div>
            )}
          </div>
          {!busy && votes.length > 0 && votes.length === participantCount && (
            <div
              className={`rt-button-row`}
              style={{
                marginTop: `var(--rt-space-4)`,
                flexWrap: `wrap`,
              }}
            >
              <button
                type={`button`}
                className={`rt-button`}
                onClick={() => setPhase(`meeting`)}
              >
                {translate(`backToDiscussion`)}
              </button>
              <button
                type={`button`}
                className={`rt-primary-button`}
                onClick={summaryAction}
              >
                {translate(`generateSummary`)}
              </button>
            </div>
          )}
        </div>
      );
    },
    renderMeetingSummary = () => (
      <div className={`rt-summary-box fadeUp`}>
        <div
          className={`rt-status-row`}
          style={{
            justifyContent: `space-between`,
            marginBottom: `var(--rt-space-3)`,
            flexWrap: `wrap`,
          }}
        >
          <div>
            <div
              className={`rt-label`}
              style={{
                marginBottom: 0,
              }}
            >
              {translate(`summaryStatus`)}
            </div>
            <div className={`rt-panel-subtitle`}>{topic || `—`}</div>
          </div>
          <div className={`rt-inline-actions`}>
            <button
              type={`button`}
              className={`rt-ghost-button`}
              onClick={() => copyText(summary)}
              disabled={!summary || busy}
            >
              {translate(`copySummary`)}
            </button>
            <button
              type={`button`}
              className={`rt-ghost-button`}
              onClick={exportMeeting}
              disabled={msgs.length === 0}
            >
              {translate(`export`)}
            </button>
            {phase === `summary` && (
              <button
                type={`button`}
                className={`rt-ghost-button`}
                onClick={() => setPhase(`meeting`)}
              >
                {translate(`back`)}
              </button>
            )}
          </div>
        </div>
        {busy && phase === `summary` ? (
          <div className={`rt-typing`}>
            <span className={`rt-dots`}>
              <span />
              <span />
              <span />
            </span>
            <span>{translate(`generating`)}</span>
          </div>
        ) : (
          summary || translate(`noSummary`)
        )}
      </div>
    ),
    renderPublishControls = () => {
      let e = currentPublishId(),
        t = publishedId === e,
        n = privateId === e;
      if (phase === `setup` || msgs.length < 2) return null;
      let r = !busy && !typingModel;
      return (
        <div className={`rt-summary-box fadeUp`}>
          <div
            className={`rt-status-row`}
            style={{
              justifyContent: `space-between`,
              gap: `var(--rt-space-3)`,
              flexWrap: `wrap`,
            }}
          >
            <div>
              <div
                className={`rt-label`}
                style={{
                  marginBottom: 0,
                }}
              >
                {translate(`publishPublic`)}
              </div>
              <div className={`rt-panel-subtitle`}>
                {publishStatus || translate(`publishHint`)}
              </div>
            </div>
            <div
              className={`rt-inline-actions`}
              style={{
                flexWrap: `wrap`,
                justifyContent: `flex-end`,
              }}
            >
              {t && (
                <span className={`rt-status-pill is-live`}>
                  {translate(`publishDone`)}
                </span>
              )}
              {n && (
                <span className={`rt-status-pill`}>
                  {translate(`publishPrivate`)}
                </span>
              )}
              <button
                type={`button`}
                className={`rt-primary-button`}
                onClick={publishMeeting}
                disabled={!r || publishing || t}
              >
                {translate(publishing ? `loading` : `publishPublic`)}
              </button>
              <button
                type={`button`}
                className={`rt-ghost-button`}
                onClick={keepMeetingPrivate}
                disabled={!r || publishing || t}
              >
                {translate(`publishPrivate`)}
              </button>
            </div>
          </div>
        </div>
      );
    },
    renderMeetingRoom = () => {
      let e = typingModel ? getModel(typingModel) : null,
        t = msgs.length === 0 && !e;
      return (
        <section
          className={`rt-panel rt-room-panel ${mobileTab === `room` ? `is-mobile-active` : ``}`}
        >
          <header className={`rt-panel-header`}>
            <div>
              <h2 className={`rt-panel-title`}>
                {translate(`meetingRoomTitle`)}
              </h2>
              <p className={`rt-panel-subtitle`}>
                {translate(
                  phase === `setup`
                    ? `meetingRoomSubSetup`
                    : `meetingRoomSubLive`,
                )}
              </p>
            </div>
            <span
              className={`rt-status-pill ${phase === `setup` ? `` : `is-live`}`}
            >
              <span className={`rt-dot`} />
              {translate(
                busy
                  ? `statusWorking`
                  : phase === `setup`
                    ? `statusReady`
                    : `live`,
              )}
            </span>
          </header>
          <div className={`rt-room-context`}>
            <div className={`rt-room-topic-row`}>
              <div>
                <div
                  className={`rt-label`}
                  style={{
                    marginBottom: `var(--rt-space-2)`,
                  }}
                >
                  {translate(`hostLabel`)}
                </div>
                <p className={`rt-host-topic`}>
                  {topic || translate(`topicPlaceholder`)}
                </p>
              </div>
              <div
                className={`rt-participant-cluster`}
                aria-label={translate(`landingModelsCount`, {
                  n: activeModels().length,
                })}
              >
                <div className={`rt-avatar-stack`}>
                  {activeModels().map((e) => (
                    <span
                      className={`rt-stack-avatar`}
                      style={{
                        "--model-color": e.color,
                      }}
                      title={e.name}
                      key={e.id}
                    >
                      {e.symbol}
                    </span>
                  ))}
                </div>
                <span>
                  {translate(`landingModelsCount`, {
                    n: activeModels().length,
                  })}
                </span>
              </div>
            </div>
            <div className={`rt-badge-row`}>
              {activeModels().map((e, t) => (
                <span
                  className={`rt-badge`}
                  style={{
                    "--model-color": e.color,
                  }}
                  key={e.id}
                >
                  <span
                    className={`rt-dot`}
                    style={{
                      color: e.color,
                    }}
                  />
                  {` `}
                  {t + 1}
                  {`. `}
                  {e.name}
                </span>
              ))}
            </div>
          </div>
          <div className={`rt-message-list`}>
            {restored && (
              <div
                style={{
                  textAlign: `center`,
                }}
              >
                <span className={`rt-system-chip`}>
                  {translate(`restoredNote`)}
                </span>
              </div>
            )}
            {t && (
              <div className={`rt-empty-state`}>
                <h3>{translate(`emptyRoomTitle`)}</h3>
                <p>{translate(`emptyRoomText`)}</p>
              </div>
            )}
            {msgs.map(renderMeetingMessage)}
            {e && (
              <div
                className={`rt-message fadeUp`}
                style={{
                  "--model-color": e.color,
                }}
              >
                <div className={`rt-message-avatar`}>{e.symbol}</div>
                <div className={`rt-typing`}>
                  <strong
                    style={{
                      color: e.color,
                    }}
                  >
                    {e.name}
                  </strong>
                  <span className={`rt-dots`}>
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>{translate(`thinking`)}</span>
                </div>
              </div>
            )}
            {renderMeetingVotes()}
            {(phase === `summary` || summary) && renderMeetingSummary()}
            {renderPublishControls()}
            {errorBanner}
            <div ref={meetingEndRef} />
          </div>
          <div className={`rt-command-bar`}>
            <div
              className={`rt-command-actions`}
              aria-label={translate(`quickActions`)}
            >
              <button
                type={`button`}
                className={`rt-command-chip`}
                onClick={askAll}
                disabled={busy || phase === `setup`}
              >{`@all`}</button>
              <button
                type={`button`}
                className={`rt-command-chip`}
                onClick={() => {
                  (setInput(`/vote`), meetingInputRef.current?.focus());
                }}
                disabled={busy || phase === `setup`}
              >{`/vote`}</button>
              <button
                type={`button`}
                className={`rt-command-chip`}
                onClick={voteAction}
                disabled={busy || phase === `setup`}
              >
                {translate(`voteAction`)}
              </button>
              <button
                type={`button`}
                className={`rt-command-chip`}
                onClick={summaryAction}
                disabled={busy || phase === `setup`}
              >
                {translate(`summarizeAction`)}
              </button>
              <button
                type={`button`}
                className={`rt-command-chip`}
                onClick={exportMeeting}
                disabled={msgs.length === 0}
              >
                {translate(`export`)}
              </button>
            </div>
            <div className={`rt-command-row`}>
              <input
                ref={meetingInputRef}
                className={`rt-input`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === `Enter` && sendMeetingMessage()}
                disabled={busy || phase === `setup`}
                placeholder={translate(
                  phase === `setup` ? `emptyRoomText` : `inputPlaceholder`,
                )}
              />
              <button
                type={`button`}
                className={`rt-primary-button`}
                onClick={() => sendMeetingMessage()}
                disabled={busy || phase === `setup` || !input.trim()}
              >
                {translate(`send`)}
              </button>
            </div>
            <p className={`rt-helper`}>{translate(`hint`)}</p>
          </div>
        </section>
      );
    },
    renderRecentMeetings = () =>
      meetingHistory.length > 0 && (
        <div className={`rt-control-stack`}>
          <div
            className={`rt-status-row`}
            style={{
              justifyContent: `space-between`,
            }}
          >
            <div
              className={`rt-label`}
              style={{
                marginBottom: 0,
              }}
            >
              {translate(`recentTitle`)}
            </div>
            <button
              type={`button`}
              className={`rt-ghost-button`}
              onClick={clearMeetingHistory}
            >
              {translate(`clearHistory`)}
            </button>
          </div>
          {meetingHistory.map((e) => (
            <button
              type={`button`}
              className={`rt-history-item`}
              onClick={() => {
                (setMobileTab(`room`), restoreMeeting(e));
              }}
              key={e.id}
            >
              <span className={`rt-history-title`}>{e.topic || `—`}</span>
              <span className={`rt-meta`}>{translate(`resume`)}</span>
            </button>
          ))}
        </div>
      ),
    renderMeetingControls = () => (
      <aside
        className={`rt-panel rt-control-panel ${mobileTab === `control` ? `is-mobile-active` : ``}`}
      >
        <header className={`rt-panel-header`}>
          <div>
            <h2 className={`rt-panel-title`}>
              {translate(`controlPanelTitle`)}
            </h2>
            <p className={`rt-panel-subtitle`}>
              {translate(`controlPanelSub`)}
            </p>
          </div>
        </header>
        <div className={`rt-panel-body`}>
          <div className={`rt-control-stack`}>
            <div>
              <div className={`rt-label`}>{translate(`modeLabel`)}</div>
              <div className={`rt-mode-grid`}>
                {[`discussion`, `vote`, `debate`].map((e) => (
                  <button
                    type={`button`}
                    className={`rt-mode-card ${mode === e ? `is-active` : ``}`}
                    onClick={() => setMode(e)}
                    disabled={busy || phase !== `setup`}
                    key={e}
                  >
                    {translate(`mode_${e}`)}
                    <span className={`rt-mode-desc`}>
                      {translate(`mode_${e}_desc`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className={`rt-vote-grid`}>
              <div className={`rt-vote-stat`}>
                <span className={`rt-panel-subtitle`}>
                  {translate(`currentRound`)}
                </span>
                <strong>
                  {translate(`roundValue`, {
                    n: currentRound,
                  })}
                </strong>
              </div>
              <div className={`rt-vote-stat`}>
                <span className={`rt-panel-subtitle`}>
                  {translate(`stageLabel`)}
                </span>
                <strong>{selected.length}</strong>
              </div>
            </div>
            {renderStage()}
            <div>
              <div className={`rt-label`}>{translate(`quickActions`)}</div>
              <div className={`rt-quick-grid`}>
                <button
                  type={`button`}
                  className={`rt-primary-button`}
                  onClick={startFromHome}
                  disabled={!canStart}
                >
                  {translate(`startBtn`)}
                </button>
                <button
                  type={`button`}
                  className={`rt-button`}
                  onClick={nextRoundAction}
                  disabled={busy || phase !== `meeting`}
                >
                  {translate(`nextRound`)}
                </button>
                <button
                  type={`button`}
                  className={`rt-button`}
                  onClick={askAll}
                  disabled={busy || phase === `setup`}
                >
                  {translate(`askAll`)}
                </button>
                <button
                  type={`button`}
                  className={`rt-button`}
                  onClick={voteAction}
                  disabled={busy || phase === `setup`}
                >
                  {translate(`voteAction`)}
                </button>
                <button
                  type={`button`}
                  className={`rt-button`}
                  onClick={summaryAction}
                  disabled={busy || phase === `setup`}
                >
                  {translate(`summarizeAction`)}
                </button>
                <button
                  type={`button`}
                  className={`rt-button`}
                  onClick={exportMeeting}
                  disabled={msgs.length === 0}
                >
                  {translate(`export`)}
                </button>
                <button
                  type={`button`}
                  className={`rt-ghost-button`}
                  onClick={newMeetingAction}
                >
                  {translate(`newMeetingFull`)}
                </button>
              </div>
            </div>
            <div className={`rt-summary-box`}>
              <div
                className={`rt-label`}
                style={{
                  marginBottom: `var(--rt-space-2)`,
                }}
              >
                {translate(`summaryStatus`)}
              </div>
              {summary || translate(`noSummary`)}
            </div>
            {renderRecentMeetings()}
          </div>
        </div>
      </aside>
    ),
    renderMobileSummary = () => (
      <aside
        className={`rt-panel rt-summary-mobile-panel ${mobileTab === `summary` ? `is-mobile-active` : ``}`}
      >
        <header className={`rt-panel-header`}>
          <div>
            <h2 className={`rt-panel-title`}>{translate(`summaryTitle`)}</h2>
            <p className={`rt-panel-subtitle`}>{translate(`voteSummary`)}</p>
          </div>
        </header>
        <div className={`rt-panel-body`}>
          <div className={`rt-control-stack`}>
            {renderMeetingVotes() || (
              <div className={`rt-empty-state`}>
                <h3>{translate(`voteSummary`)}</h3>
                <p>
                  {translate(`voted`, {
                    n: votes.length,
                    t: participantCount,
                  })}
                </p>
              </div>
            )}
            {renderMeetingSummary()}
            {renderRecentMeetings()}
          </div>
        </div>
      </aside>
    );
  if (route !== `home`) return renderRoute();
  if (meetingPhases.includes(phase) && phase !== `setup`)
    return (
      <div className={`rt-app`}>
        {renderNavigation()}
        <main className={`rt-shell`}>
          {renderHero()}
          {renderMobileTabs()}
          <div className={`rt-workspace-grid`}>
            {renderParticipants()}
            {renderMeetingRoom()}
            {renderMeetingControls()}
            {renderMobileSummary()}
          </div>
        </main>
      </div>
    );
  if (phase === `setup`) {
    let e =
        modelCatalog.length === DEFAULT_MODELS.length &&
        modelCatalog.every((e, t) => e.id === DEFAULT_MODELS[t]?.id),
      t = [
        ...modelCatalog.map((e) => ({
          ...e,
          connected: true,
        })),
        ...(e
          ? COMING_SOON_MODELS.map((e) => ({
              ...e,
              connected: false,
            }))
          : []),
      ],
      n = modelsExpanded ? MODEL_EXPANDED_COUNT : MODEL_PREVIEW_COUNT,
      r = t.slice(0, n),
      i = Math.max(0, t.length - r.length),
      a = [
        {
          id: `vote`,
          label: translate(`setupModePoll`),
          active: mode === `vote`,
        },
        {
          id: `debate`,
          label: translate(`setupModeDebate`),
          active: mode !== `vote`,
        },
      ],
      l = [
        {
          id: `yesno`,
          label: translate(`setupAnswerYesNo`),
        },
        {
          id: `custom`,
          label: translate(`setupAnswerCustom`),
        },
        {
          id: `open`,
          label: translate(`setupAnswerOpen`),
        },
      ];
    return (
      <div className={`rt-app`}>
        {renderNavigation()}
        <main className={`rt-shell`}>
          {renderHero()}
          <section className={`rt-setup-stack fadeUp`}>
            <div className={`rt-composer-card`}>
              <label className={`rt-label`} htmlFor={`topic-input`}>
                {translate(`topicLabel`)}
              </label>
              <textarea
                id={`topic-input`}
                className={`rt-composer-textarea`}
                autoFocus={true}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  (e.ctrlKey || e.metaKey) &&
                    e.key === `Enter` &&
                    canStart &&
                    startFromHome();
                }}
                placeholder={translate(`topicPlaceholder`)}
                aria-label={translate(`topicLabel`)}
              />
              <div className={`rt-composer-footer`}>
                <div className={`rt-composer-controls`}>
                  <div
                    className={`rt-segmented`}
                    aria-label={translate(`modeLabel`)}
                  >
                    {a.map((e) => (
                      <button
                        type={`button`}
                        className={`rt-segment ${e.active ? `is-active` : ``}`}
                        onClick={() => {
                          (setMode(e.id),
                            setAnswerType(e.id === `vote` ? `yesno` : `open`));
                        }}
                        aria-pressed={e.active}
                        key={e.id}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`rt-segmented`}
                    aria-label={translate(`questionTypeLabel`)}
                  >
                    {l.map((e) => (
                      <button
                        type={`button`}
                        className={`rt-segment ${answerType === e.id ? `is-active` : ``}`}
                        onClick={() => {
                          (setAnswerType(e.id),
                            setMode(e.id === `open` ? `discussion` : `vote`));
                        }}
                        aria-pressed={answerType === e.id}
                        key={e.id}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <span className={`rt-inline-note`}>
                    <span
                      className={`rt-info-icon`}
                      aria-hidden={`true`}
                    >{`i`}</span>
                    <span>
                      <strong>{activeModels().length}</strong>
                      {` `}
                      {translate(`modelsSelectedInline`)}
                    </span>
                  </span>
                </div>
                <button
                  type={`button`}
                  className={`rt-submit-arrow`}
                  onClick={startFromHome}
                  disabled={!canStart}
                  aria-label={translate(`startBtn`)}
                  title={translate(`startBtn`)}
                >{`→`}</button>
              </div>
              {answerType === `custom` && (
                <div className={`rt-custom-options`}>
                  <div className={`rt-custom-options-head`}>
                    <div className={`rt-label`}>
                      {translate(`customOptionsLabel`)}
                    </div>
                  </div>
                  <div className={`rt-custom-options-grid`}>
                    {_coItems.map((e, t) => (
                      <div className={`rt-custom-option-cell`} key={t}>
                        <span className={`rt-custom-option-letter`}>
                          {String.fromCharCode(65 + t)}
                          {`:`}
                        </span>
                        <input
                          className={`rt-custom-option-input`}
                          value={e}
                          onChange={(e) => _setCoItem(t, e.target.value)}
                          placeholder={`${translate(`customOptionsOptionPlaceholder`)} ${String.fromCharCode(65 + t)}`}
                          aria-label={`${translate(`customOptionsOptionPlaceholder`)} ${String.fromCharCode(65 + t)}`}
                        />
                        {_coItems.length > 2 && (
                          <button
                            type={`button`}
                            className={`rt-custom-option-remove`}
                            onClick={() => _removeCoItem(t)}
                            aria-label={`Remove option ${String.fromCharCode(65 + t)}`}
                          >{`x`}</button>
                        )}
                      </div>
                    ))}
                    {_coItems.length < 6 && (
                      <button
                        type={`button`}
                        className={`rt-custom-option-add`}
                        onClick={_addCoItem}
                      >
                        {translate(`customOptionsAdd`)}
                      </button>
                    )}
                  </div>
                  <div
                    className={`rt-custom-options-note ${customOptionsText.trim() && _a.length < 2 ? `is-error` : ``}`}
                  >
                    {customOptionsText.trim() && _a.length < 2
                      ? translate(`customOptionsInvalid`)
                      : translate(`customOptionsHelp`)}
                  </div>
                </div>
              )}
            </div>
            <details
              id={`home-history`}
              className={`rt-history-accordion`}
              open={meetingHistory.length > 0}
            >
              <summary className={`rt-history-summary`}>
                <strong>
                  {translate(`pastQuestionsLabel`)}
                  {` `}
                  <span className={`rt-history-count`}>
                    {`(`}
                    {meetingHistory.length}
                    {`)`}
                  </span>
                </strong>
                <span>
                  {meetingHistory.length > 0
                    ? translate(`showMore`)
                    : translate(`noPastQuestions`)}
                </span>
              </summary>
              <div className={`rt-history-panel`}>
                {meetingHistory.length > 0 ? (
                  <div className={`rt-history-list`}>
                    <div
                      className={`rt-inline-actions`}
                      style={{
                        justifyContent: `flex-end`,
                        marginBottom: `4px`,
                        flexWrap: `wrap`,
                      }}
                    >
                      <button
                        type={`button`}
                        className={`rt-ghost-button`}
                        onClick={clearMeetingHistory}
                      >
                        {translate(`clearHistory`)}
                      </button>
                    </div>
                    {meetingHistory.map((e) => (
                      <button
                        type={`button`}
                        className={`rt-history-item`}
                        onClick={() => {
                          (navOpen(`room`), restoreMeeting(e));
                        }}
                        key={e.id}
                      >
                        <span className={`rt-history-title`}>
                          {e.topic || `—`}
                        </span>
                        <span className={`rt-meta`}>{translate(`resume`)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={`rt-history-empty`}>
                    {translate(`pastQuestionsEmpty`)}
                  </div>
                )}
              </div>
            </details>
            <section
              id={`home-models`}
              className={`rt-models-strip`}
              aria-label={translate(`panelistsLabel`)}
            >
              <div className={`rt-models-header`}>
                <strong>{translate(`landingModelsHeader`)}</strong>
                {` · `}
                {translate(`landingModelsCount`, {
                  n: activeModels().length,
                })}
                {` · `}
                <button
                  type={`button`}
                  onClick={() => setModelPickerOpen(true)}
                >
                  {translate(`landingBrowseAll`)}
                </button>
              </div>
              <div className={`rt-model-pill-wrap`}>
                {r.map((e) => {
                  let t = selected.includes(e.id),
                    n = e.connected && isModelDisabled(e.id);
                  return e.connected ? (
                    <button
                      type={`button`}
                      className={`rt-model-pill ${t && !n ? `is-selected` : ``} ${n ? `is-disabled` : ``}`}
                      onClick={() => toggleModel(e.id)}
                      aria-pressed={t}
                      disabled={n || (t && activeModels().length <= 2)}
                      title={n ? translate(`adminModelDisabled`) : void 0}
                      key={e.id}
                    >
                      {renderModelPillIcon(e, t && !n)}
                      <span>{e.name}</span>
                      {n ? (
                        <span className={`rt-model-pill-meta`}>
                          {translate(`adminModelDisabled`)}
                        </span>
                      ) : (
                        !t && (
                          <span className={`rt-model-pill-meta`}>
                            {e.company}
                          </span>
                        )
                      )}
                    </button>
                  ) : (
                    <button
                      type={`button`}
                      className={`rt-model-pill is-disabled`}
                      disabled={true}
                      title={translate(`modelComingSoon`)}
                      key={e.name}
                    >
                      {renderModelPillIcon(e, false)}
                      <span>{e.name}</span>
                    </button>
                  );
                })}
              </div>
              {setModelsExpanded && t.length > MODEL_PREVIEW_COUNT && (
                <button
                  type={`button`}
                  className={`rt-browse-all-button`}
                  onClick={() => setModelPickerOpen(true)}
                >
                  {translate(`landingBrowseAllModels`, {
                    n: t.length,
                  })}
                </button>
              )}
              {!setModelsExpanded && i > 0 ? (
                <button
                  type={`button`}
                  className={`rt-show-more-button`}
                  onClick={() => modelPickerOpen(true)}
                >
                  {translate(`showMore`)}
                </button>
              ) : setModelsExpanded ? (
                <button
                  type={`button`}
                  className={`rt-show-more-button`}
                  onClick={() => modelPickerOpen(false)}
                >
                  {translate(`collapseModels`)}
                </button>
              ) : null}
            </section>
            <p id={`home-stats`} className={`rt-example-line`}>
              {translate(`exampleAsked`)}
              {` `}
              <button
                type={`button`}
                className={`rt-example-link`}
                onClick={loadExampleQuestion}
              >
                {translate(`exampleLink`)}
              </button>
              {`.`}
            </p>
            <div className={`rt-browse-discussions`}>
              <button
                type={`button`}
                className={`rt-example-link`}
                onClick={() => navigate(`history`)}
              >
                {translate(`browseAllDiscussions`)}
              </button>
            </div>
            {errorBanner}
          </section>
          {renderModelPicker(t)}
        </main>
      </div>
    );
  }
  return null;
}
