import test from "node:test";
import assert from "node:assert/strict";
import {
  runDiscussion,
  summaryMessages,
  discussionContext,
  measuredStanceChanges,
  validateAssessment,
} from "../src/lib/discussion.js";
import { parseSSEFrame } from "../src/lib/api-client.js";

const models = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

test("independent answers run concurrently and cannot see each other", async () => {
  const started = [];
  const prompts = [];
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const result = await runDiscussion({
    topic: "Choose an approach",
    models,
    mode: "independent",
    ask: async (id, messages) => {
      started.push(id);
      prompts.push(messages[0].content);
      if (started.length === models.length) release();
      await barrier;
      return `unique answer ${id}`;
    },
  });
  assert.equal(result.turns.length, 3);
  assert.ok(prompts.every((prompt) => !prompt.includes("unique answer")));
  assert.equal(result.completedRounds, 1);
});

test("a failed participant does not discard successful replies", async () => {
  const result = await runDiscussion({
    topic: "Discuss",
    models,
    mode: "independent",
    ask: async (id) => {
      if (id === "b") throw new Error("Temporarily unavailable");
      return `${id} position`;
    },
  });
  assert.equal(result.turns.filter((t) => t.content).length, 2);
  assert.match(
    result.turns.find((t) => t.modelId === "b").error,
    /unavailable/,
  );
});

test("automatic debate preserves history and stops after two stable assessments, no earlier than round 3", async () => {
  const prompts = [];
  const result = await runDiscussion({
    topic: "Pilot?",
    models,
    mode: "debate_auto",
    rounds: 6,
    ask: async (id, messages, options) => {
      const text = messages[0].content;
      prompts.push(text);
      if (options.purpose === "assessment")
        return JSON.stringify({
          positions: models.map((m) => ({
            modelId: m.id,
            stance: "pilot",
            quote: `pilot-${m.id}`,
          })),
          consensus: "full",
          unresolved: [],
        });
      return `pilot-${id}`;
    },
  });
  assert.equal(result.completedRounds, 3);
  assert.equal(result.stoppedBy, "stable-agreement");
  assert.ok(
    prompts.some(
      (p) => p.includes("[Round 1 · Alpha · a]") && p.includes("Round 3 of"),
    ),
  );
  assert.equal(result.changes.length, 0);
});

test("unverified judge quotes cannot manufacture consensus or stance counts", async () => {
  const result = await runDiscussion({
    topic: "Question",
    models,
    mode: "debate_auto",
    rounds: 4,
    ask: async (id, messages, options) =>
      options.purpose === "assessment"
        ? JSON.stringify({
            positions: models.map((m) => ({
              modelId: m.id,
              stance: "same",
              quote: "invented evidence",
            })),
            consensus: "full",
            unresolved: [],
          })
        : `original statement ${id}`,
  });
  assert.equal(result.completedRounds, 4);
  assert.equal(result.stoppedBy, "round-limit");
  assert.equal(result.changes, null);
});

test("cancellation prevents subsequent speakers and rounds", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    runDiscussion({
      topic: "Question",
      models,
      signal: controller.signal,
      ask: async () => {
        calls++;
        controller.abort();
        return "done";
      },
    }),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
});

test("summary contains first and final round evidence; unknown is not converted to zero", () => {
  const turns = [
    { modelId: "a", modelName: "Alpha", round: 1, content: "First choice: A" },
    { modelId: "a", modelName: "Alpha", round: 4, content: "Final choice: B" },
  ];
  const summary = summaryMessages({ topic: "Choose", turns, lang: "en" })[0]
    .content;
  assert.match(summary, /First choice: A/);
  assert.match(summary, /Final choice: B/);
  assert.match(summary, /not measured reliably/);
  assert.equal(measuredStanceChanges(null, null), null);
});

test("context preserves initial statements when recent history is long", () => {
  const turns = Array.from({ length: 36 }, (_, n) => ({
    modelId: String(n % 6),
    modelName: `M${n % 6}`,
    round: Math.floor(n / 6) + 1,
    content: `turn-${n} ` + "x".repeat(2000),
  }));
  const context = discussionContext([], turns, 24_000);
  for (let n = 0; n < 6; n++) assert.ok(context.includes(`turn-${n} `));
  assert.ok(context.includes("turn-35 "));
  assert.ok(context.length <= 25_000);
});

test("stance reversal needs complete, quoted first and final assessments", () => {
  const firstTurns = [
    { modelId: "a", content: "I choose A" },
    { modelId: "b", content: "I choose B" },
  ];
  const first = validateAssessment(
    {
      positions: [
        { modelId: "a", stance: "A", quote: "choose A" },
        { modelId: "b", stance: "B", quote: "choose B" },
      ],
      unresolved: ["choice"],
    },
    firstTurns,
  );
  const last = validateAssessment(
    {
      positions: [
        { modelId: "a", stance: "B", quote: "choose B" },
        { modelId: "b", stance: "B", quote: "choose B" },
      ],
      unresolved: [],
      consensus: "full",
    },
    [
      { modelId: "a", content: "I now choose B" },
      { modelId: "b", content: "I still choose B" },
    ],
  );
  assert.deepEqual(
    measuredStanceChanges(first, last).map((p) => p.modelId),
    ["a"],
  );
});

test("SSE frames handle CRLF and multiple data lines", () => {
  assert.deepEqual(
    parseSSEFrame("event: token\r\ndata: first\r\ndata: second"),
    { event: "token", data: "first\nsecond" },
  );
});
