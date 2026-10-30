import React, { useState } from "react";
import { pollResult, pollSummary } from "../lib/poll.js";
import { exportPollPoster } from "../lib/poll-poster.js";
import { requestJSON } from "../lib/api-client.js";

export default function PollCard({ card, lang, modelFor }) {
  const zh = lang === "zh",
    result = pollResult(card),
    [message, setMessage] = useState(""),
    [publicUrl, setPublicUrl] = useState(card.publicUrl || ""),
    [busy, setBusy] = useState(false);
  const names = new Set(result.votes.map((v) => v.modelId));
  const rows = [
    ...result.votes,
    ...(card.models || [])
      .filter((id) => !names.has(id))
      .map((modelId) => ({
        modelId,
        modelName: modelFor(modelId).name,
        pending: (card.pendingModelIds || []).includes(modelId),
        reason: card.errors?.[modelId] || "",
      })),
  ];
  async function publish() {
    if (busy || publicUrl) return;
    if (
      !confirm(
        zh
          ? "将问题、各模型投票与理由公开到此实例的历史中？请先确认没有隐私信息。"
          : "Publish the question, model votes and reasons to this instance’s public history? Check for private information first.",
      )
    )
      return;
    setBusy(true);
    try {
      const data = await requestJSON("/api/discussions", {
        question: card.topic,
        mode: "vote",
        answerType: result.groups.every((g) => ["YES", "NO"].includes(g.option))
          ? "yesno"
          : "custom",
        lang,
        summary: pollSummary(card, lang),
        modelNames: rows.map((v) => v.modelName),
        votes: result.votes,
        voteOptions: result.groups.map((g) => g.option),
        transcript: [],
      });
      setPublicUrl(data.publicUrl || data.url);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rt-poll-card"
      aria-label={zh ? "投票结果" : "Poll result"}
    >
      <header className="rt-poll-brand">
        <strong>ChatOOP AI Roundtable</strong>
        <span>{zh ? "模型投票" : "Model poll"}</span>
      </header>
      <div className="rt-poll-content">
        <h2>{card.topic}</h2>
        <div
          className="rt-poll-bar"
          aria-label={zh ? "有效票比例" : "Valid-vote proportions"}
        >
          {result.groups
            .filter((g) => g.votes.length)
            .map((g) => (
              <div
                key={g.label}
                style={{ background: g.color, flex: g.votes.length }}
              >
                {g.votes.length}
              </div>
            ))}
        </div>
        <div className="rt-poll-legend">
          {result.groups.map((g) => (
            <span key={g.label}>
              {g.label}: {g.option} ·{" "}
              {result.valid
                ? Math.round((g.votes.length / result.valid) * 100)
                : 0}
              %
            </span>
          ))}
        </div>
        <div className="rt-poll-roster">
          {rows.map((v) => {
            const model = modelFor(v.modelId),
              group = result.groups.find((g) => g.votes.includes(v));
            return (
              <div key={v.modelId} className="rt-poll-person">
                <div
                  className="rt-poll-logo"
                  style={{ borderColor: group?.color || "#e9edf2" }}
                >
                  {model.logoUrl ? (
                    <img src={model.logoUrl} alt="" />
                  ) : (
                    <span>
                      {model.symbol || v.modelName?.slice(0, 2) || "AI"}
                    </span>
                  )}
                  <b style={{ background: group?.color || "#edf0f4" }}>
                    {v.pending ? "…" : group?.label || "?"}
                  </b>
                </div>
                <span>{v.modelName || model.name}</span>
              </div>
            );
          })}
        </div>
        <details open>
          <summary>{zh ? "最终总结" : "Final summary"}</summary>
          <p>{pollSummary(card, lang)}</p>
          <p className="rt-helper">
            {zh
              ? `${result.valid} 张有效票 / ${result.total} 个模型；无效或失败的回复不计入比例。`
              : `${result.valid} valid votes / ${result.total} models; invalid or failed replies are excluded from proportions.`}
          </p>
        </details>
        <details open>
          <summary>
            {zh ? "模型决策" : "Model decisions"} ({rows.length})
          </summary>
          <div>
            {rows.map((v) => {
              const group = result.groups.find((g) => g.votes.includes(v));
              return (
                <div key={v.modelId} className="rt-poll-decision">
                  <b style={{ background: group?.color || "#edf0f4" }}>
                    {v.pending ? "…" : group?.label || "?"}
                  </b>
                  <div>
                    <strong>{v.modelName || modelFor(v.modelId).name}</strong>
                    <p>
                      {v.pending
                        ? zh
                          ? "正在等待投票…"
                          : "Waiting for a vote…"
                        : v.reason ||
                          (zh
                            ? "没有返回有效投票。"
                            : "No valid vote was returned.")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
        <div className="sc-actions">
          <button
            className="sc-btn"
            disabled={card.loading || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await exportPollPoster(card, lang, publicUrl);
              } catch (error) {
                setMessage(error.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {zh ? "保存分享长图" : "Save share poster"}
          </button>
          <button
            className="sc-btn"
            onClick={() =>
              navigator.clipboard
                .writeText(card.topic + "\n\n" + pollSummary(card, lang))
                .then(() => setMessage(zh ? "已复制。" : "Copied."))
                .catch(() =>
                  setMessage(zh ? "剪贴板不可用。" : "Clipboard unavailable."),
                )
            }
          >
            {zh ? "复制结果" : "Copy result"}
          </button>
          {publicUrl ? (
            <a className="sc-btn" href={publicUrl}>
              {zh ? "公开页面" : "Public page"}
            </a>
          ) : (
            <button
              className="sc-btn"
              disabled={card.loading || busy}
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
