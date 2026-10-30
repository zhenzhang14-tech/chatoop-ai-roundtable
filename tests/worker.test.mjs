import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

function environment(overrides = {}) {
  const store = new Map();
  return {
    MOCK_MODE: "true",
    ALLOW_ANONYMOUS: "true",
    SESSIONS: {
      async get(k) {
        const item = store.get(k);
        return item && (!item.exp || item.exp > Date.now()) ? item.value : null;
      },
      async put(k, value, o = {}) {
        store.set(k, {
          value,
          exp: o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : 0,
        });
      },
      async delete(k) {
        store.delete(k);
      },
      async list({ prefix = "" }) {
        return {
          keys: [...store.keys()]
            .filter((k) => k.startsWith(prefix))
            .map((name) => ({ name })),
          list_complete: true,
        };
      },
    },
    ...overrides,
  };
}
function request(path, body, token, origin = "http://127.0.0.1:5180") {
  return new Request(`http://127.0.0.1:8787${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("health explicitly identifies simulated replies and disabled billing", async () => {
  const body = await (
    await worker.fetch(request("/api/health"), environment())
  ).json();
  assert.equal(body.mock, true);
  assert.equal(body.billingEnabled, false);
});

test("fresh installation exposes callable demo models without copying credentials", async () => {
  const body = await (
    await worker.fetch(request("/api/models"), environment())
  ).json();
  assert.equal(body.models.length, 3);
  assert.ok(body.models.every((m) => m.id.startsWith("demo-")));
  assert.ok(!JSON.stringify(body).includes("apiKey"));
});

test("mock model produces a real API response and SSE completion", async () => {
  const env = environment();
  const body = {
    model: "demo-planner",
    messages: [
      {
        role: "user",
        content: "Original topic: Test\nReply entirely in English",
      },
    ],
  };
  const response = await worker.fetch(request("/api/chat", body), env);
  assert.equal(response.status, 200);
  assert.match((await response.json()).reply, /Simulated response/);
  const stream = await worker.fetch(request("/api/chat/stream", body), env);
  const text = await stream.text();
  assert.match(text, /event: token/);
  assert.match(text, /event: done/);
});

test("remote real-provider calls require authentication by default", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "x",
        messages: [{ role: "user", content: "test" }],
      }),
    }),
    environment({ MOCK_MODE: "false", ALLOW_ANONYMOUS: "false" }),
  );
  assert.equal(response.status, 401);
});

test("a localhost origin is not automatically trusted by a remote deployment", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/chat", {
      method: "POST",
      headers: {
        Origin: "http://localhost:5000",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
    environment(),
  );
  assert.equal(response.status, 403);
});

test("registration is opt-in and first signup never grants admin", async () => {
  const data = {
    email: "fixture@example.test",
    password: "a-test-only-passphrase",
    name: "Fixture",
  };
  const closed = await worker.fetch(
    request("/api/auth/signup", data),
    environment(),
  );
  assert.equal(closed.status, 403);
  const open = await worker.fetch(
    request("/api/auth/signup", data),
    environment({
      ENABLE_REGISTRATION: "true",
      ADMIN_EMAILS: "fixture@example.test",
    }),
  );
  assert.equal(open.status, 200);
  assert.equal((await open.json()).user.role, "user");
});

test("client-submitted amounts cannot charge or bypass a wallet", async () => {
  const response = await worker.fetch(
    request("/api/wallet/usage", { amount: 0, modelCount: 100 }),
    environment(),
  );
  assert.equal(response.status, 405);
});

test("password reset does not pretend that an email was sent", async () => {
  const response = await worker.fetch(
    request("/api/auth/request-password-reset", {
      email: "fixture@example.test",
    }),
    environment(),
  );
  assert.equal(response.status, 501);
});

test("a fresh public history is empty and does not invent model answers or upvotes", async () => {
  const response = await worker.fetch(
    request("/api/discussions"),
    environment(),
  );
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.total, 0);
  assert.deepEqual(data.items, []);
});

test("real-mode login remains reachable when anonymous model calls are disabled", async () => {
  const response = await worker.fetch(
    request("/api/auth/login", {
      email: "nobody@example.test",
      password: "fixture-only",
    }),
    environment({ MOCK_MODE: "false", ALLOW_ANONYMOUS: "false" }),
  );
  assert.equal(response.status, 401);
  assert.doesNotMatch(
    (await response.json()).error,
    /does not allow anonymous/,
  );
});
