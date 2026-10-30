import QRCode from "qrcode";
import { pollResult, pollSummary } from "./poll.js";

function wrap(ctx, text, width) {
  const lines = [];
  let line = "";
  for (const character of String(text || "")) {
    if (character === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    if (ctx.measureText(line + character).width > width && line) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function exportPollPoster(card, lang = "en", publicUrl = "") {
  await Promise.race([
    document.fonts?.ready || Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
  const zh = lang === "zh",
    result = pollResult(card),
    width = 1440,
    padding = 88,
    contentWidth = width - padding * 2;
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  const font = '"Microsoft YaHei", "Noto Sans SC", Arial, sans-serif';
  ctx.font = `700 46px ${font}`;
  const titleLines = wrap(
    ctx,
    String(card.topic || "ChatOOP AI Roundtable").slice(0, 1000),
    contentWidth,
  );
  ctx.font = `26px ${font}`;
  const rows = result.votes.map((v) => ({
    vote: v,
    lines: wrap(
      ctx,
      String(
        v.reason || (zh ? "没有有效理由。" : "No valid reason was returned."),
      ).slice(0, 1200),
      contentWidth - 72,
    ),
  }));
  const summary = String(card.summary || pollSummary(card, lang)).slice(
      0,
      3000,
    ),
    summaryLines = wrap(ctx, summary, contentWidth);
  canvas.width = width;
  canvas.height =
    620 +
    titleLines.length * 66 +
    result.groups.length * 34 +
    rows.reduce((n, r) => n + 112 + r.lines.length * 40, 0) +
    summaryLines.length * 42;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, width, 90);
  ctx.fillStyle = "#8b94a4";
  ctx.font = `700 22px ${font}`;
  ctx.fillText("AI ROUNDTABLE POLL", padding, 55);
  ctx.textAlign = "right";
  ctx.font = `22px ${font}`;
  ctx.fillText(window.location.host, width - padding, 55);
  ctx.textAlign = "left";
  let y = 160;
  ctx.fillStyle = "#111827";
  ctx.font = `700 46px ${font}`;
  for (const line of titleLines) {
    ctx.fillText(line, padding, y);
    y += 66;
  }
  y += 28;
  let x = padding;
  for (const group of result.groups) {
    if (!group.votes.length) continue;
    const w = (contentWidth * group.votes.length) / Math.max(result.valid, 1);
    ctx.fillStyle = group.color;
    ctx.fillRect(x, y, w, 64);
    ctx.fillStyle = "#1f4b51";
    ctx.font = `700 29px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText(String(group.votes.length), x + w / 2, y + 43);
    ctx.textAlign = "left";
    x += w;
  }
  y += 92;
  ctx.fillStyle = "#667085";
  ctx.font = `23px ${font}`;
  for (const group of result.groups) {
    ctx.fillText(
      `${group.label}: ${group.option} · ${result.valid ? Math.round((group.votes.length / result.valid) * 100) : 0}%`,
      padding,
      y,
    );
    y += 34;
  }
  y += 20;
  for (const row of rows) {
    const vote = row.vote,
      group = result.groups.find((g) => g.votes.includes(vote));
    ctx.fillStyle = group?.color || "#edf0f4";
    ctx.beginPath();
    ctx.arc(padding + 22, y + 17, 24, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = `700 24px ${font}`;
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.fillText(group?.label || "?", padding + 22, y + 26);
    ctx.textAlign = "left";
    ctx.font = `700 29px ${font}`;
    ctx.fillStyle = "#111827";
    ctx.fillText(vote.modelName || vote.modelId, padding + 64, y + 27);
    y += 70;
    ctx.font = `26px ${font}`;
    ctx.fillStyle = "#667085";
    for (const line of row.lines) {
      ctx.fillText(line, padding + 64, y);
      y += 40;
    }
    y += 42;
  }
  ctx.strokeStyle = "#e2e5eb";
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 46;
  ctx.font = `700 24px ${font}`;
  ctx.fillStyle = "#8b94a4";
  ctx.fillText(zh ? "最终总结" : "Final summary", padding, y);
  y += 44;
  ctx.font = `26px ${font}`;
  ctx.fillStyle = "#475569";
  for (const line of summaryLines) {
    ctx.fillText(line, padding, y);
    y += 42;
  }
  const footerY = canvas.height - 170;
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, footerY, width, 170);
  ctx.fillStyle = "#111827";
  ctx.font = `700 32px ${font}`;
  ctx.fillText("ChatOOP AI Roundtable", padding, footerY + 65);
  ctx.fillStyle = "#8b94a4";
  ctx.font = `22px ${font}`;
  ctx.fillText(window.location.host, padding, footerY + 108);
  if (publicUrl) {
    const link = new URL(publicUrl, window.location.origin);
    if (
      link.protocol === "https:" &&
      !["localhost", "127.0.0.1"].includes(link.hostname)
    ) {
      const data = await QRCode.toDataURL(link.href, { width: 128, margin: 1 });
      const image = new Image();
      image.src = data;
      await image.decode();
      ctx.drawImage(image, width - padding - 128, footerY + 14, 128, 128);
    }
  }
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Image export failed");
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "chatoop-ai-roundtable-poll.png";
  a.click();
  URL.revokeObjectURL(url);
}
