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
    <aside>
      <button type="button" onClick={handleCreate}>新建会话</button>
      <ul>
        {conversations.map((conv) => (
          <li key={conv.id}>{conv.title}</li>
        ))}
      </ul>
    </aside>
  );
}
