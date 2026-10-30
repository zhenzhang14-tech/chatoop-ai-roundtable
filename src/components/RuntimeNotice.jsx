import React, { useEffect, useState } from "react";
import { requestJSON } from "../lib/api-client.js";
export default function RuntimeNotice() {
  const [health, setHealth] = useState(null);
  const [zh, setZh] = useState(/^zh/i.test(navigator.language));
  useEffect(() => {
    requestJSON("/api/health", undefined, { method: "GET", timeoutMs: 10000 })
      .then(setHealth)
      .catch(() => setHealth({ offline: true }));
    const update = () => setZh(document.documentElement.lang.startsWith("zh"));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    update();
    return () => observer.disconnect();
  }, []);
  if (!health?.mock && !health?.offline) return null;
  return (
    <aside
      className={`rt-runtime-notice ${health.offline ? "is-error" : ""}`}
      role="status"
    >
      {health.offline
        ? zh
          ? "本地服务尚未连接，请按 README 启动完整应用。"
          : "The API is not connected. Follow the README to start the full app."
        : zh
          ? "演示模式 · 所有回复均为模拟数据，不代表真实模型表现。"
          : "Demo mode · All replies are simulated, not evidence of real model performance."}
    </aside>
  );
}
