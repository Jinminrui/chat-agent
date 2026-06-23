"use client";

import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/chat/sidebar";
import { Composer } from "@/components/chat/composer";
import { EmptyState } from "@/components/chat/empty-state";
import { createConversation } from "@/lib/api/conversations";

export default function ChatPage() {
  const router = useRouter();

  async function handleMessage(message: string) {
    const conversation = await createConversation();
    router.push(`/chat/${conversation.id}?message=${encodeURIComponent(message)}`);
  }

  function handleSuggestionClick(suggestion: string) {
    handleMessage(suggestion);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">新会话</h1>
            <Badge variant="secondary" className="ml-auto">
              GPT-4
            </Badge>
          </header>
          <main className="flex-1 overflow-hidden">
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          </main>
          <Composer onSubmit={handleMessage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
