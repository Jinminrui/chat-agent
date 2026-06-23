"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Conversation } from "@chat-agent/shared";
import { listConversations, createConversation } from "@/lib/api/conversations";

export function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) return;
    listConversations().then((data) => setConversations(data.items));
  }, []);

  const handleCreate = useCallback(async () => {
    const conv = await createConversation();
    setConversations((prev) => [conv, ...prev]);
    router.push(`/chat/${conv.id}`);
  }, [router]);

  return (
    <aside style={{ background: "var(--bg-sidebar)", padding: "1rem" }}>
      <button
        type="button"
        onClick={handleCreate}
        style={{
          background: "var(--accent-primary)",
          color: "#fff",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "4px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        新建会话
      </button>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
        {conversations.map((conv) => (
          <li
            key={conv.id}
            style={{
              padding: "0.5rem",
              borderBottom: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            {conv.title}
          </li>
        ))}
      </ul>
    </aside>
  );
}
