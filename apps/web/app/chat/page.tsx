"use client";

import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/chat/sidebar";
import { Composer } from "@/components/chat/composer";
import { createConversation } from "@/lib/api/conversations";

export default function ChatPage() {
  const router = useRouter();

  async function handleMessage(message: string) {
    const conversation = await createConversation();
    router.push(`/chat/${conversation.id}?message=${encodeURIComponent(message)}`);
  }

  return (
    <main className="chat-shell">
      <Sidebar />
      <section style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: "2rem", color: "var(--text-secondary)", textAlign: "center" }}>
          欢迎开始新的对话
        </div>
        <Composer onSubmit={handleMessage} />
      </section>
    </main>
  );
}
