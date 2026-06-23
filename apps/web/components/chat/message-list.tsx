"use client";

import type { Message } from "@chat-agent/shared";

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role === "user" ? "你" : "AI"}:</strong>
          <span>{msg.content}</span>
        </div>
      ))}
    </div>
  );
}
