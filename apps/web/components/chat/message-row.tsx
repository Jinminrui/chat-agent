import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@chat-agent/shared";
import { AssistantMarkdown } from "./assistant-markdown";
import type { ProcessStatus } from "@/features/chat/use-chat-stream";

interface MessageRowProps {
  /** 消息数据 */
  message: Message;
  /** Agent 过程状态（仅助手消息且正在流式接收时显示） */
  processStatus?: ProcessStatus;
}

/**
 * 单条消息行组件
 *
 * 功能：
 * - 根据消息角色（用户/助手）显示不同样式和头像
 * - 用户消息右对齐，助手消息左对齐
 * - 助手消息使用 Markdown 渲染，用户消息使用纯文本
 * - 显示 Agent 过程状态（如搜索中、工具调用中）
 * - 空的助手消息不渲染内容（优化流式体验）
 */
export function MessageRow({ message, processStatus }: MessageRowProps) {
  const isUser = message.role === "user";
  // 助手消息内容为空时不渲染（避免流式初期显示空白气泡）
  const shouldRenderContent = isUser || message.content.trim().length > 0;

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
        {/* Agent 过程状态徽章：显示工具调用状态 */}
        {processStatus && (
          <Badge
            variant="secondary"
            className="gap-1.5 bg-muted/50 text-xs font-normal"
          >
            {processStatus.status === "success" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {processStatus.label}
          </Badge>
        )}
        {/* 消息内容：用户用纯文本，助手用 Markdown */}
        {shouldRenderContent && (
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
        )}
      </div>
    </div>
  );
}
