"use client";

import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/chat/sidebar";
import { Composer } from "@/components/chat/composer";
import { createConversation } from "@/lib/api/conversations";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function ChatPage() {
  const router = useRouter();

  async function handleMessage(message: string) {
    const conversation = await createConversation();
    router.push(`/chat/${conversation.id}?message=${encodeURIComponent(message)}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-muted-foreground">
          欢迎开始新的对话
        </div>
        <Composer onSubmit={handleMessage} />
      </SidebarInset>
    </SidebarProvider>
  );
}
