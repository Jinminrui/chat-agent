import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@chat-agent/shared";
import { AssistantMarkdown } from "./assistant-markdown";

interface MessageRowProps {
  message: Message;
  toolStatus?: {
    toolName: string;
    status: "running" | "success" | "error";
    label: string;
  };
}

export function MessageRow({ message, toolStatus }: MessageRowProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            isUser
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isUser ? "你" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        {toolStatus && toolStatus.status === "running" && (
          <Badge
            variant="secondary"
            className="gap-1.5 bg-muted/50 text-xs font-normal"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            {toolStatus.label}
          </Badge>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted/50 text-foreground rounded-bl-md",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <AssistantMarkdown content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
