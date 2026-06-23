"use client";

import type { Message } from "@chat-agent/shared";

export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", textAlign: "center" }}>
        暂无消息，开始对话吧
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            marginBottom: "0.75rem",
            color: "var(--text-primary)",
          }}
        >
          <strong>{msg.role === "user" ? "你" : "AI"}:</strong>{" "}
          <span>{msg.content}</span>
        </div>
      ))}
    </div>
  );
}
