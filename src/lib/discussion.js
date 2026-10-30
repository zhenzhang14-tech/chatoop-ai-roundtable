/** Shared discussion engine. Views render events; this module owns each run. */
export function abortIfNeeded(signal) {
  if (signal?.aborted)
    throw new DOMException("Discussion stopped", "AbortError");
}

export function parseObject(text) {
  try {
    const source = String(text || "")
      .replace(/^```(?:json)?\s*|\s*```$/g, "")
      .trim();
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function normalizeStance(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s.!。！]+$/g, "");
}

/** Preserve every round and participant, with an explicit excerpt marker. */
export function transcriptEvidence(turns, maxChars = 48_000) {
  const valid = turns.filter((turn) => turn?.content && !turn.error);
  const perTurn = Math.max(
    120,
    Math.min(2_000, Math.floor(maxChars / Math.max(1, valid.length)) - 90),
  );
  return valid
    .map((turn) => {
      const text = String(turn.content);
      const excerpt =
        text.length > perTurn
          ? `${text.slice(0, perTurn)}\n[excerpt / 节选]`
          : text;
      return `[Round ${turn.round || 1} · ${turn.modelName || turn.modelId} · ${turn.modelId}]\n${excerpt}`;
    })
    .join("\n\n");
}

/** Recent context plus the first and latest statement of each model. */
export function discussionContext(history, turns, maxChars = 24_000) {
  const first = new Map(),
    last = new Map();
  for (const turn of turns) {
    if (!turn.content || turn.error) continue;
    if (!first.has(turn.modelId)) first.set(turn.modelId, turn);
    last.set(turn.modelId, turn);
  }
  const recent = history
    .filter((m) => m?.content && m.kind !== "error")
    .slice(-12)
    .map(
      (m) =>
        `${m.model || m.modelId || m.role}: ${String(m.content).slice(0, 600)}`,
    )
    .join("\n");
  const preserved = [
    ...new Set([...first.values(), ...last.values(), ...turns.slice(-12)]),
  ];
  return (
    `${recent ? `Earlier conversation / 先前对话:\n${recent.slice(-5_000)}\n\n` : ""}` +
    transcriptEvidence(
      preserved,
      maxChars - Math.min(5_000, recent.length) - 100,
    )
  );
}

export function validateAssessment(raw, turns, previous = []) {
  if (!raw || !Array.isArray(raw.positions)) return null;
  const actual = new Map(
    turns.filter((t) => t.content && !t.error).map((t) => [t.modelId, t]),
  );
  const positions = [];
  const seen = new Set();
  for (const item of raw.positions) {
    const turn = actual.get(item.modelId);
    const quote = String(item.quote || "").trim();
    const stance = String(item.stance || "").trim();
    if (
      !turn ||
      seen.has(item.modelId) ||
      !quote ||
      !stance ||
      !turn.content.includes(quote)
    )
      continue;
    seen.add(item.modelId);
    positions.push({
      modelId: item.modelId,
      stance: stance.slice(0, 160),
      quote,
    });
  }
  const complete = positions.length === actual.size && actual.size >= 2;
  const samePosition =
    new Set(positions.map((p) => normalizeStance(p.stance))).size === 1;
  const unresolved = Array.isArray(raw.unresolved)
    ? raw.unresolved.map(String).slice(0, 8)
    : ["Assessment incomplete"];
  return {
    positions,
    unresolved,
    complete,
    // Agreement is an estimate of stated positions, never verification of truth.
    consensus:
      complete &&
      samePosition &&
      raw.consensus === "full" &&
      unresolved.length === 0
        ? "full"
        : "partial",
    previous,
  };
}

export function measuredStanceChanges(first, last) {
  if (!first?.complete || !last?.complete) return null;
  const before = new Map(first.positions.map((p) => [p.modelId, p]));
  const changes = last.positions.filter(
    (p) =>
      before.has(p.modelId) &&
      normalizeStance(before.get(p.modelId).stance) !==
        normalizeStance(p.stance),
  );
  return changes.map((p) => ({
    modelId: p.modelId,
    before: before.get(p.modelId),
    after: p,
  }));
}

function assessmentPrompt(topic, round, roundTurns, previous) {
  return (
    `Assess only the participants' explicitly stated final answers, not their tone or confidence.\n` +
    `Topic: ${topic}\nRound: ${round}\nEarlier canonical labels: ${JSON.stringify(previous?.positions || [])}\n` +
    `Use the same short stance label for the same final answer. A concession or lower confidence alone is NOT a changed answer.\n` +
    `For every participant provide an exact short quote copied from that participant's response as evidence. Omit positions that cannot be determined.\n` +
    `Return only JSON: {"positions":[{"modelId":"...","stance":"short final-answer label","quote":"exact quote"}],"consensus":"full|partial","unresolved":["substantive disagreement"]}.\n` +
    `Only use full when every participant explicitly chooses the same final answer and there are no substantive unresolved issues.\n` +
    transcriptEvidence(roundTurns)
  );
}

function speakerPrompt({
  topic,
  model,
  round,
  rounds,
  mode,
  history,
  turns,
  lang,
  persona,
}) {
  const opening =
    round === 1 && (mode === "independent" || mode === "debate_auto");
  const own = [...turns]
    .reverse()
    .find((t) => t.modelId === model.id && t.content && !t.error);
  const task = opening
    ? "Give your own independent answer. Do not assume or react to other participants in this round."
    : round === rounds && mode === "debate_auto"
      ? "Close with your current final answer, what evidence changed your view (if any), and any disagreement you still hold. Do not invent consensus."
      : "Respond to an actual point in the discussion. Add useful evidence or an unresolved angle. You may agree, disagree, revise your view explicitly, or pass. Do not argue merely to sound different.";
  return [
    `You are ${model.name}, one participant in ChatOOP AI Roundtable.`,
    persona
      ? `Speaking style only; it must not determine your conclusion: ${persona}`
      : "",
    `Original topic: ${topic}`,
    `Round ${round}${mode === "debate_auto" ? ` of at most ${rounds}` : ""}.`,
    opening
      ? discussionContext(history, [], 8_000)
      : discussionContext(history, turns),
    own
      ? `Your own previous statement (do not attribute it to another person): ${own.content.slice(0, 1_500)}`
      : "",
    task,
    "Do not fabricate citations, statistics or claims about live events. State uncertainty when evidence is missing. Explain conclusions without revealing private internal reasoning.",
    lang === "zh"
      ? "全程用简体中文，像群聊发言，完整表达观点即可；避免重复套话。"
      : "Reply entirely in English, as a natural group-chat participant. Be concise but finish your thought.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runDiscussion({
  topic,
  models,
  mode = "discussion",
  rounds = 4,
  history = [],
  lang = "en",
  personas = {},
  ask,
  signal,
  onStart = () => {},
  onToken = () => {},
  onReply = () => {},
  onRound = () => {},
  assess = mode === "debate_auto",
  judgeModel,
}) {
  if (!String(topic || "").trim()) throw new Error("A topic is required");
  if (!models.length) throw new Error("Select at least one model");
  const limit = mode === "debate_auto" ? Math.min(6, Math.max(3, rounds)) : 1;
  const turns = [],
    assessments = [];
  let completedRounds = 0,
    stoppedBy = "round-limit",
    stableConsensus = 0;
  for (let round = 1; round <= limit; round++) {
    abortIfNeeded(signal);
    const roundTurns = [];
    // Rotate the first speaker instead of permanently anchoring discussion on one model.
    const offset = (round - 1) % models.length;
    const order =
      round === 1
        ? models
        : [...models.slice(offset), ...models.slice(0, offset)];
    const speak = async (model) => {
      abortIfNeeded(signal);
      const id = `${round}:${model.id}`;
      onStart({ id, model, round });
      try {
        const content = await ask(
          model.id,
          [
            {
              role: "user",
              content: speakerPrompt({
                topic,
                model,
                round,
                rounds: limit,
                mode,
                history,
                turns: [...turns, ...roundTurns],
                lang,
                persona: personas[model.id],
              }),
            },
          ],
          {
            signal,
            purpose: "discussion",
            onToken: (token) => onToken({ id, model, round, token }),
          },
        );
        abortIfNeeded(signal);
        if (!String(content || "").trim())
          throw new Error(
            lang === "zh"
              ? "模型未返回有效内容"
              : "The model returned no content",
          );
        const turn = {
          id,
          modelId: model.id,
          modelName: model.name,
          content: String(content),
          round,
        };
        roundTurns.push(turn);
        onReply(turn);
      } catch (error) {
        abortIfNeeded(signal);
        const turn = {
          id,
          modelId: model.id,
          modelName: model.name,
          round,
          content: "",
          error: error.message,
        };
        roundTurns.push(turn);
        onReply(turn);
      }
    };
    if (mode === "independent" || (mode === "debate_auto" && round === 1))
      await Promise.all(order.map(speak));
    else for (const model of order) await speak(model);
    abortIfNeeded(signal);
    if (!roundTurns.some((t) => t.content && !t.error))
      throw new Error(
        lang === "zh"
          ? "所有模型均未成功回答，请重试或更换模型。"
          : "No model answered successfully. Retry or choose other models.",
      );
    turns.push(...roundTurns);
    completedRounds = round;
    let assessment = null;
    if (assess && roundTurns.filter((t) => t.content && !t.error).length >= 2) {
      try {
        const raw = await ask(
          judgeModel || models[0].id,
          [
            {
              role: "user",
              content: assessmentPrompt(
                topic,
                round,
                roundTurns,
                assessments.at(-1),
              ),
            },
          ],
          { signal, purpose: "assessment" },
        );
        abortIfNeeded(signal);
        assessment = validateAssessment(
          parseObject(raw),
          roundTurns,
          assessments.at(-1)?.positions,
        );
      } catch {
        abortIfNeeded(signal);
      }
    }
    assessments.push(assessment);
    stableConsensus =
      assessment?.complete &&
      assessment.consensus === "full" &&
      roundTurns.every((t) => !t.error)
        ? stableConsensus + 1
        : 0;
    await onRound({ round, turns: [...turns], roundTurns, assessment });
    if (mode === "debate_auto" && round >= 3 && stableConsensus >= 2) {
      stoppedBy = "stable-agreement";
      break;
    }
  }
  return {
    topic,
    turns,
    assessments,
    completedRounds,
    stoppedBy,
    changes: measuredStanceChanges(assessments[0], assessments.at(-1)),
  };
}

export function summaryMessages({
  topic,
  turns,
  assessments = [],
  lang = "en",
}) {
  const changes = measuredStanceChanges(assessments[0], assessments.at(-1));
  const evidence = {
    initial: assessments[0]?.positions || [],
    final: assessments.at(-1)?.positions || [],
    changes,
  };
  return [
    {
      role: "user",
      content: [
        "You are the neutral meeting editor for ChatOOP AI Roundtable. Summarize only the supplied discussion evidence. Never invent agreement, quotations or position changes.",
        `Original topic: ${topic}`,
        "The transcript includes all available rounds. [excerpt] means the original was shortened. Explicitly acknowledge missing or failed responses when they affect the conclusion.",
        `Quoted position assessment (model-estimated, not proof): ${JSON.stringify(evidence)}`,
        changes === null
          ? "Stance changes were not measured reliably. Report unknown / 未测量. Do NOT invent a numeric count."
          : `The recorded stance-change count is ${changes.length}. Reproduce that count; do not infer additional changes from tone, confidence or concessions.`,
        lang === "zh"
          ? "全程简体中文。先用一句话给出结论，然后输出：立场改变：数字或未测量（注明基于发言的估计）；共识程度：完全共识/高度共识/部分共识/分歧较大（发言估计）。再分为：共识点、分歧点、新角度、结论置信度。每个重要判断标明模型和轮次；不要把共识当作事实核验。"
          : "Reply entirely in English. Start with one conclusion sentence, then StanceChanges: number or Unknown (estimated from statements); Consensus level: Full Consensus/High Consensus/Partial Consensus/Divided (statement estimate). Include Consensus, Divergence, Fresh angles, Confidence. Attribute key claims to model and round. Agreement does not establish factual correctness.",
        `Failed replies / 失败记录: ${JSON.stringify(turns.filter((t) => t.error).map((t) => ({ modelId: t.modelId, round: t.round, error: t.error })))}`,
        transcriptEvidence(turns),
      ].join("\n\n"),
    },
  ];
}
