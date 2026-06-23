"use client";

import { useState, useEffect } from "react";
import type { Conversation } from "@chat-agent/shared";
import { listConversations } from "@/lib/api/conversations";

export function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) return;
    listConversations().then((data) => setConversations(data.items));
  }, []);

  return (
    <aside>
      <button type="button">新建会话</button>
      <ul>
        {conversations.map((conv) => (
          <li key={conv.id}>{conv.title}</li>
        ))}
      </ul>
    </aside>
  );
}
