"use client";

import { useState } from "react";

export function Composer({ onSubmit }: { onSubmit: (message: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", padding: "1rem" }}>
      <textarea
        placeholder="输入消息..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          flex: 1,
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "4px",
          padding: "0.5rem",
          resize: "vertical",
        }}
      />
      <button
        type="submit"
        style={{
          background: "var(--accent-primary)",
          color: "#fff",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        发送
      </button>
    </form>
  );
}
