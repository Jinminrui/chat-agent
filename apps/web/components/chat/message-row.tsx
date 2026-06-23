import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@chat-agent/shared";

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
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar>
        <AvatarFallback
          className={cn(
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {isUser ? "你" : "AI"}
        </AvatarFallback>
      </Avatar>
      <Card
        className={cn(
          "max-w-[80%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
        size="sm"
      >
        <CardContent>
          {toolStatus && toolStatus.status === "running" && (
            <Badge variant="secondary" className="mb-2 gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {toolStatus.label}
            </Badge>
          )}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </CardContent>
      </Card>
    </div>
  );
}
