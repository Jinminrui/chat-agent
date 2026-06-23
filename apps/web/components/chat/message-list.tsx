"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageRow } from "./message-row";
import type { Message } from "@chat-agent/shared";

interface MessageListProps {
  messages: Message[];
  toolStatus?: {
    toolName: string;
    status: "running" | "success" | "error";
    label: string;
  };
}

export function MessageList({ messages, toolStatus }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/60">暂无消息，开始对话吧</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="pb-4">
        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            message={msg}
            toolStatus={
              msg.role === "assistant" && toolStatus ? toolStatus : undefined
            }
          />
        ))}
      </div>
    </ScrollArea>
  );
}
