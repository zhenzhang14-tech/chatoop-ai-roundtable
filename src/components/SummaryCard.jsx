import React, { useState } from "react";
import { requestJSON } from "../lib/api-client.js";

export default function SummaryCard({ card, lang, onRegenerate }) {
  const zh = lang === "zh";
  const [message, setMessage] = useState("");
  const [publicUrl, setPublicUrl] = useState(card.publicUrl || "");
  const [publishing, setPublishing] = useState(false);
  const turns = card.transcript || card.results || [];
  const last = card.assessments?.at(-1);
  const latest = new Map();
  for (const turn of turns)
    if (turn.content && !turn.error) latest.set(turn.modelId, turn);
  const positions = new Map((last?.positions || []).map((p) => [p.modelId, p]));
  const changed = Array.isArray(card.changes)
    ? new Set(card.changes.map((c) => c.modelId))
    : null;
  const rounds =
    card.completedRounds || Math.max(1, ...turns.map((t) => t.round || 1));
  const consensus = !last?.complete
    ? zh
      ? "未评估"
      : "Not assessed"
    : last.consensus === "full"
      ? zh
        ? "发言趋同"
        : "Statements aligned"
      : zh
        ? "仍有分歧"
        : "Differences remain";
  async function publish() {
    if (publishing || publicUrl) return;
    if (
      !window.confirm(
        zh
          ? "公开后，问题、模型发言和摘要会出现在此实例的公开历史中，知道链接的人都能查看。确认内容不含隐私信息并公开？"
          : "Publish the question, model replies and summary to this instance’s public history? Anyone with access to the instance can read them. Check for private information first.",
      )
    )
      return;
    setPublishing(true);
    setMessage("");
    try {
      const data = await requestJSON("/api/discussions", {
        question: card.topic,
        mode: "debate",
        answerType: "open",
        lang,
        summary: card.summary,
        modelNames: [...latest.values()].map((t) => t.modelName || t.modelId),
        transcript: turns.map((t) => ({
          type: "model",
          modelId: t.modelId,
          modelName: t.modelName,
          round: t.round,
          content: t.content || "",
          error: t.error,
        })),
        votes: [],
      });
      setPublicUrl(data.publicUrl || data.url);
      setMessage(zh ? "已公开。" : "Published.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPublishing(false);
    }
  }
  function exportMarkdown() {
    const body =
      `# ${card.topic || "ChatOOP AI Roundtable"}\n\n${card.summary || ""}\n\n` +
      turns
        .map(
          (t) =>
            `## ${zh ? "第" : "Round "}${t.round || 1}${zh ? " 轮" : ""} · ${t.modelName || t.modelId}\n\n${t.error ? `[${zh ? "失败" : "Failed"}] ${t.error}` : t.content}`,
        )
        .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([body], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "chatoop-ai-roundtable.md";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (!card.summary && !card.summaryLoading && !card.summaryError) return null;
  return (
    <section
      className="sc-card"
      aria-label={zh ? "圆桌摘要" : "Roundtable summary"}
    >
      <div className="sc-card-toggle">
        <div>
          <div className="sc-slabel">
            {zh ? "圆桌摘要" : "Roundtable summary"}
          </div>
          <h2 className="sc-topic">{card.topic}</h2>
          <div className="sc-meta">
            {latest.size} {zh ? "个模型" : "models"} · {rounds}{" "}
            {zh ? "轮" : "rounds"}
          </div>
        </div>
        <span className="sc-pill sc-pill-amber">{consensus}</span>
      </div>
      <div className="sc-card-body">
        {card.summaryLoading ? (
          <p role="status">
            {zh
              ? "正在根据各轮记录生成摘要…"
              : "Summarizing the discussion record…"}
          </p>
        ) : card.summaryError ? (
          <p role="alert">{card.summaryError}</p>
        ) : (
          <div className="rt-summary-prose">{card.summary}</div>
        )}
        <p className="rt-helper">
          {zh ? "立场变化" : "Stance changes"}:{" "}
          {changed ? changed.size : zh ? "未测量" : "Unknown"} ·{" "}
          {zh
            ? "基于模型发言的估计，不代表事实核验。"
            : "Estimated from model statements; not factual verification."}
        </p>
        <div className="sc-models">
          {[...latest.values()].map((turn) => (
            <div className="sc-mrow" key={turn.modelId}>
              <div className="sc-minfo">
                <strong>{turn.modelName || turn.modelId}</strong>
                <p className="sc-mstance">
                  {positions.get(turn.modelId)?.stance ||
                    turn.content.slice(0, 200)}
                </p>
                {positions.has(turn.modelId) && (
                  <q>{positions.get(turn.modelId).quote}</q>
                )}
              </div>
              <span className="sc-badge sc-badge-steady">
                {changed
                  ? changed.has(turn.modelId)
                    ? zh
                      ? "已改变"
                      : "Changed"
                    : zh
                      ? "未检测到改变"
                      : "No change detected"
                  : zh
                    ? "未测量"
                    : "Unknown"}
              </span>
            </div>
          ))}
        </div>
        <div className="sc-actions">
          <button
            type="button"
            className="sc-btn"
            disabled={!card.summary}
            onClick={() =>
              navigator.clipboard
                .writeText(card.summary)
                .then(() => setMessage(zh ? "已复制。" : "Copied."))
                .catch(() =>
                  setMessage(
                    zh
                      ? "无法访问剪贴板，请手动选择复制。"
                      : "Clipboard unavailable; select and copy the text.",
                  ),
                )
            }
          >
            {zh ? "复制摘要" : "Copy summary"}
          </button>
          <button type="button" className="sc-btn" onClick={exportMarkdown}>
            {zh ? "导出 Markdown" : "Export Markdown"}
          </button>
          <button
            type="button"
            className="sc-btn"
            disabled={card.summaryLoading}
            onClick={() => onRegenerate(card)}
          >
            {zh ? "重新生成" : "Regenerate"}
          </button>
          {publicUrl ? (
            <a className="sc-btn" href={publicUrl}>
              {zh ? "打开公开页面" : "Open public page"}
            </a>
          ) : (
            <button
              type="button"
              className="sc-btn"
              disabled={publishing || !card.summary}
              onClick={publish}
            >
              {zh ? "公开分享" : "Publish & share"}
            </button>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </div>
    </section>
  );
}
