import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import worker from "../worker/index.js";

const root = process.cwd();
let fileEnv = {};
try {
  const text = await fs.readFile(path.join(root, ".dev.vars"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) fileEnv[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const env = {
  MOCK_MODE: "true",
  ALLOW_ANONYMOUS: "true",
  ...fileEnv,
  ...process.env,
};
const statePath = path.join(root, ".local", "state.json");
let state = {};
try {
  state = JSON.parse(await fs.readFile(statePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
let pendingSave = Promise.resolve();
function persist() {
  pendingSave = pendingSave.then(async () => {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath + ".tmp", JSON.stringify(state));
    await fs.rename(statePath + ".tmp", statePath);
  });
  return pendingSave;
}
env.SESSIONS = {
  async get(key) {
    const item = state[key];
    if (!item || (item.exp && item.exp <= Date.now())) return null;
    return item.value;
  },
  async put(key, value, options = {}) {
    state[key] = {
      value,
      exp: options.expirationTtl
        ? Date.now() + options.expirationTtl * 1000
        : 0,
    };
    await persist();
  },
  async delete(key) {
    delete state[key];
    await persist();
  },
  async list({ prefix = "", cursor = "" } = {}) {
    const keys = Object.keys(state)
      .filter(
        (k) =>
          k.startsWith(prefix) && (!state[k].exp || state[k].exp > Date.now()),
      )
      .sort();
    const offset = Number(cursor || 0),
      page = keys.slice(offset, offset + 1000);
    return {
      keys: page.map((name) => ({ name })),
      cursor: String(offset + page.length),
      list_complete: offset + page.length >= keys.length,
    };
  },
};
const server = http.createServer(async (incoming, outgoing) => {
  const controller = new AbortController();
  incoming.on("aborted", () => controller.abort());
  outgoing.on("close", () => {
    if (!outgoing.writableEnded) controller.abort();
  });
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of incoming) {
      bytes += chunk.length;
      if (bytes > 256_000) {
        outgoing.writeHead(413);
        outgoing.end("Request too large");
        return;
      }
      chunks.push(chunk);
    }
    const host = incoming.headers.host || "127.0.0.1:8787";
    const method = incoming.method || "GET";
    const request = new Request(`http://${host}${incoming.url}`, {
      method,
      headers: incoming.headers,
      signal: controller.signal,
      ...(["GET", "HEAD"].includes(method)
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
    const response = await worker.fetch(request, env, {
      waitUntil: (promise) => promise.catch(() => {}),
    });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          outgoing.write(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
    }
    outgoing.end();
  } catch (error) {
    if (!outgoing.headersSent)
      outgoing.writeHead(error.name === "AbortError" ? 499 : 500, {
        "Content-Type": "application/json",
      });
    outgoing.end(
      JSON.stringify({
        error:
          error.name === "AbortError" ? "Request stopped" : "Local API error",
      }),
    );
  }
});
const port = Number(process.env.PORT || 8787);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `ChatOOP AI Roundtable API: http://127.0.0.1:${port} (${env.MOCK_MODE === "true" ? "simulated replies" : "configured provider"})`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
