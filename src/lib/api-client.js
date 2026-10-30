const API_URL = (import.meta.env?.VITE_API_URL || "").replace(/\/$/, "");

function credentials() {
  try {
    return localStorage.getItem("chatoop_rt_token_v1") || "";
  } catch {
    return "";
  }
}

function requestSignal(signal, ms) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, ms);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    },
  };
}

function headers() {
  const token = credentials();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function requestJSON(
  path,
  body,
  { signal, method = "POST", timeoutMs = 90_000 } = {},
) {
  const request = requestSignal(signal, timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: headers(),
      signal: request.signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw Object.assign(new Error(data.error || `API ${response.status}`), {
        status: response.status,
        detail: data.error,
      });
    return data;
  } finally {
    request.dispose();
  }
}

export async function chatAPI(model, messages, options = {}) {
  return (
    (await requestJSON("/api/chat", { model, messages }, options)).reply || ""
  );
}

export function parseSSEFrame(frame) {
  const lines = frame.split(/\r?\n/);
  return {
    event:
      lines
        .find((line) => line.startsWith("event:"))
        ?.slice(6)
        .trim() || "message",
    data: lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n"),
  };
}

export async function streamChatAPI(
  model,
  messages,
  onToken,
  { signal, timeoutMs = 120_000 } = {},
) {
  const request = requestSignal(signal, timeoutMs);
  let reader;
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ model, messages }),
      signal: request.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw Object.assign(new Error(data.error || `API ${response.status}`), {
        status: response.status,
      });
    }
    if (!response.body)
      throw Object.assign(new Error("Streaming is unavailable"), {
        status: 501,
      });
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "",
      reply = "",
      completed = "";
    const consume = (frame) => {
      const { event, data } = parseSSEFrame(frame);
      if (!data || data === "[DONE]") return;
      const value = JSON.parse(data);
      if (event === "error") throw new Error(value.error || "Stream failed");
      if (event === "token") {
        reply += value.token || "";
        onToken?.(value.token || "");
      }
      if (event === "done") completed = value.reply || value.content || "";
    };
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";
      frames.forEach(consume);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!completed && !reply) throw new Error("The model returned no content");
    return completed || reply;
  } finally {
    if (reader) await reader.cancel().catch(() => {});
    request.dispose();
  }
}

export async function reliableChatAPI(model, messages, onToken, options = {}) {
  try {
    return await streamChatAPI(model, messages, onToken, options);
  } catch (error) {
    // Never silently duplicate a billed request after timeout, partial output or cancellation.
    if (options.signal?.aborted || ![404, 405, 415, 501].includes(error.status))
      throw error;
    const reply = await chatAPI(model, messages, options);
    onToken?.(reply);
    return reply;
  }
}
