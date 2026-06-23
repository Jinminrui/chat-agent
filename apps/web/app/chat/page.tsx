"use client";

import { Sidebar } from "@/components/chat/sidebar";
import { Composer } from "@/components/chat/composer";

export default function ChatPage() {
  function handleMessage(message: string) {
    // TODO: create conversation and send message
    console.log(message);
  }

  return (
    <main>
      <Sidebar />
      <section>
        <div>欢迎开始新的对话</div>
        <Composer onSubmit={handleMessage} />
      </section>
    </main>
  );
}
