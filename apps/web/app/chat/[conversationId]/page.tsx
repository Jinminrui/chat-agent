"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams, usePathname, useRouter } from "next/navigation";
import type { Message } from "@chat-agent/shared";
import { getMe } from "@/lib/api/auth";
import { listMessages } from "@/lib/api/conversations";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/chat/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { useChatStream } from "@/features/chat/use-chat-stream";

function createLocalMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const autoMessageSentRef = useRef(false);

  useEffect(() => {
    let active = true;

    getMe()
      .then(() => {
        if (active) {
          setAuthReady(true);
        }
      })
      .catch(() => {
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleStreamComplete = useCallback(
    (response: string) => {
      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            id: createLocalMessageId(),
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

  const { streaming, delta, processStatus, send } = useChatStream({
    onComplete: handleStreamComplete,
  });

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let active = true;

    listMessages(conversationId)
      .then((items) => {
        if (active) {
          setMessages(items);
          setMessagesLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          router.replace("/login");
        }
      });

    return () => {
      active = false;
    };
  }, [authReady, conversationId]);

  const handleSend = useCallback(
    (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: createLocalMessageId(),
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

  const streamingMessageId = `streaming-assistant-${conversationId}`;

  const visibleMessages = useMemo(() => {
    if (!streaming || (!delta && !processStatus)) {
      return messages;
    }

    return [
      ...messages,
      {
        id: streamingMessageId,
        conversationId,
        role: "assistant" as const,
        content: delta,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [
    conversationId,
    delta,
    messages,
    processStatus,
    streaming,
    streamingMessageId,
  ]);

  useEffect(() => {
    if (!authReady || !messagesLoaded) return;

    const message = searchParams.get("message");
    if (!message || autoMessageSentRef.current) return;

    autoMessageSentRef.current = true;
    router.replace(pathname, { scroll: false });
    handleSend(message);
  }, [searchParams, pathname, router, handleSend]);

  if (!authReady || !messagesLoaded) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <header className="flex h-12 items-center gap-2 border-b border-border/40 px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <h1 className="text-sm font-medium text-foreground/80">会话</h1>
          </header>
          <main className="flex-1 overflow-hidden">
            <MessageList
              messages={visibleMessages}
              processStatus={processStatus}
              streamingMessageId={streaming ? streamingMessageId : null}
            />
          </main>
          <Composer onSubmit={handleSend} disabled={streaming} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
