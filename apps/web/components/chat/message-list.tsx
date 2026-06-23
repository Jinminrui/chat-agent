"use client";

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
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">暂无消息，开始对话吧</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
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
