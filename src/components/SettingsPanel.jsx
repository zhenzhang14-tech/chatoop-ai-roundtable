import React, { useState } from "react";
import { requestJSON } from "../lib/api-client.js";

export default function SettingsPanel({
  lang,
  onLanguage,
  authUser,
  onUser,
  models,
  rounds,
  onRounds,
  sessions,
  onOpen,
  onDelete,
  onExport,
  onBack,
}) {
  const zh = lang === "zh";
  const [name, setName] = useState(authUser?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(action) {
    setPending(true);
    setMessage("");
    try {
      await action();
      setMessage(zh ? "已保存。" : "Saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="rt-shell">
      <section className="rt-account-page">
        <div className="rt-account-head">
          <div>
            <p className="rt-detail-kicker">ChatOOP AI Roundtable</p>
            <h1>{zh ? "设置与本地会话" : "Settings & local conversations"}</h1>
          </div>
          <button className="rt-button" onClick={onBack}>
            {zh ? "返回讨论" : "Back to discussion"}
          </button>
        </div>
        {message && (
          <p role="status" className="rt-settings-message">
            {message}
          </p>
        )}
        <section className="rt-account-section">
          <h2>{zh ? "偏好设置" : "Preferences"}</h2>
          <label className="rt-form-field">
            {zh ? "界面语言" : "Interface language"}
            <select value={lang} onChange={(e) => onLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="zh">简体中文</option>
            </select>
          </label>
          <label className="rt-form-field">
            {zh ? "自动辩论最多轮次" : "Maximum automatic debate rounds"}
            <select
              value={rounds}
              onChange={(e) => onRounds(Number(e.target.value))}
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <p className="rt-helper">
            {zh
              ? "连续两轮的发言评估显示一致，且至少完成三轮时，可提前结束。共识不等于事实正确。"
              : "May finish after at least three rounds when two consecutive assessments find stable agreement. Agreement is not factual verification."}
          </p>
          <p>
            {zh ? "当前可用模型" : "Available models"}:{" "}
            {models.map((m) => m.name).join(", ")}
          </p>
          <p className="rt-helper">
            {zh
              ? "模型密钥由实例管理员在服务端配置；这里不会把密钥保存在浏览器。"
              : "Provider keys are configured on the server by the instance operator; this page does not store keys in your browser."}
          </p>
        </section>
        {authUser && (
          <section className="rt-account-section">
            <h2>{zh ? "账户" : "Account"}</h2>
            <p>{authUser.email}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () =>
                  onUser(
                    (await requestJSON("/api/auth/profile", { name })).user,
                  ),
                );
              }}
            >
              <label className="rt-form-field">
                {zh ? "显示名称" : "Display name"}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <button className="rt-button" disabled={pending}>
                {zh ? "保存名称" : "Save name"}
              </button>
            </form>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () => {
                  await requestJSON("/api/auth/change-password", {
                    currentPassword,
                    newPassword,
                  });
                  localStorage.removeItem("chatoop_rt_token_v1");
                  onUser(null);
                  setCurrentPassword("");
                  setNewPassword("");
                });
              }}
            >
              <label className="rt-form-field">
                {zh ? "当前密码" : "Current password"}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>
              <label className="rt-form-field">
                {zh
                  ? "新密码（至少 12 个字符）"
                  : "New password (at least 12 characters)"}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  minLength={12}
                  maxLength={256}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
              <button className="rt-button" disabled={pending}>
                {zh
                  ? "修改密码并退出所有设备"
                  : "Change password & sign out all devices"}
              </button>
            </form>
            <p className="rt-helper">
              {zh
                ? "此版本不发送找回密码邮件，也不提供虚假的账户删除按钮。"
                : "This version does not send password-reset email. Account deletion is an operator-managed operation."}
            </p>
          </section>
        )}
        <section className="rt-account-section">
          <div className="rt-section-head">
            <h2>{zh ? "此浏览器的会话" : "Conversations in this browser"}</h2>
            <button
              className="rt-button"
              onClick={onExport}
              disabled={!sessions.length}
            >
              {zh ? "导出全部 Markdown" : "Export all as Markdown"}
            </button>
          </div>
          <p className="rt-helper">
            {zh
              ? "会话保存在当前浏览器，不会随账户自动跨设备同步。"
              : "Conversations are stored in this browser; signing in does not synchronize them across devices."}
          </p>
          <div className="rt-light-list">
            {sessions.map((session) => (
              <div className="rt-light-row" key={session.id}>
                <div className="rt-row-main">
                  <span className="rt-row-title">
                    {session.title || (zh ? "新会话" : "New conversation")}
                  </span>
                  <span className="rt-row-meta">
                    {session.msgs?.length || 0} {zh ? "条消息" : "messages"}
                  </span>
                </div>
                <div className="rt-row-actions">
                  <button
                    className="rt-ghost-button"
                    onClick={() => onOpen(session.id)}
                  >
                    {zh ? "打开" : "Open"}
                  </button>
                  <button
                    className="rt-ghost-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          zh
                            ? "删除此浏览器中的这条会话？建议先导出。"
                            : "Delete this local conversation? Export it first if you need a copy.",
                        )
                      )
                        onDelete(session.id);
                    }}
                  >
                    {zh ? "删除" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
