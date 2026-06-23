"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, usePathname, useRouter } from "next/navigation";
import type { Message } from "@chat-agent/shared";
import { listMessages } from "@/lib/api/conversations";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/chat/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { useChatStream } from "@/features/chat/use-chat-stream";

export default function ConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const autoMessageSentRef = useRef(false);

  const handleStreamComplete = useCallback(
    (response: string) => {
      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            conversationId,
            role: "assistant",
            content: response,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    },
    [conversationId],
  );

  const { streaming, delta, send } = useChatStream({ onComplete: handleStreamComplete });

  useEffect(() => {
    listMessages(conversationId).then((data) => setMessages(data.items));
  }, [conversationId]);

  const handleSend = useCallback(
    (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversationId,
          role: "user",
          content: message,
          createdAt: new Date().toISOString(),
        },
      ]);
      send(conversationId, message);
    },
    [conversationId, send],
  );

  useEffect(() => {
    const message = searchParams.get("message");
    if (!message || autoMessageSentRef.current) return;

    autoMessageSentRef.current = true;
    router.replace(pathname, { scroll: false });
    handleSend(message);
  }, [searchParams, pathname, router, handleSend]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">会话</h1>
            <Badge variant="secondary" className="ml-auto">
              GPT-4
            </Badge>
          </header>
          <main className="flex-1 overflow-hidden">
            <MessageList messages={messages} />
            {streaming && delta && (
              <div className="border-t bg-muted/50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm">{delta}</p>
              </div>
            )}
          </main>
          <Composer onSubmit={handleSend} disabled={streaming} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
