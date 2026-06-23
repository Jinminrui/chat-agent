"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Message } from "@chat-agent/shared";
import { listMessages } from "@/lib/api/conversations";
import { Sidebar } from "@/components/chat/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { useChatStream } from "@/features/chat/use-chat-stream";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);

  const handleStreamComplete = useCallback(
    (response: string) => {
      if (response) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), conversationId, role: "assistant", content: response, createdAt: new Date().toISOString() },
        ]);
      }
    },
    [conversationId],
  );

  const { streaming, delta, send } = useChatStream({ onComplete: handleStreamComplete });

  useEffect(() => {
    listMessages(conversationId).then((data) => setMessages(data.items));
  }, [conversationId]);

  function handleSend(message: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), conversationId, role: "user", content: message, createdAt: new Date().toISOString() },
    ]);
    send(conversationId, message);
  }

  return (
    <main className="chat-shell">
      <Sidebar />
      <section style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          <MessageList messages={messages} />
          {streaming && <div style={{ padding: "0 1rem", color: "var(--text-secondary)" }}>{delta}</div>}
        </div>
        <Composer onSubmit={handleSend} />
      </section>
    </main>
  );
}
