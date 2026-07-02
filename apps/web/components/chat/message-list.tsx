"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);

  const getViewport = useCallback(
    () =>
      rootRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      ) ?? null,
    [],
  );

  const scrollToBottom = useCallback((behavior?: ScrollBehavior) => {
    if (typeof bottomRef.current?.scrollIntoView !== "function") {
      return;
    }

    bottomRef.current.scrollIntoView(
      behavior ? { block: "end", behavior } : { block: "end" },
    );
  }, []);

  const isNearBottom = useCallback((viewport: HTMLElement) => {
    return (
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 80
    );
  }, []);

  useEffect(() => {
    const viewport = getViewport();

    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      const nearBottom = isNearBottom(viewport);

      setIsPinnedToBottom(nearBottom);
      if (nearBottom) {
        setShowJumpButton(false);
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [getViewport, isNearBottom]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    if (isPinnedToBottom) {
      scrollToBottom();
      return;
    }

    setShowJumpButton(true);
  }, [isPinnedToBottom, messages, scrollToBottom]);

  const handleJumpToBottom = () => {
    setIsPinnedToBottom(true);
    setShowJumpButton(false);
    scrollToBottom("smooth");
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/60">暂无消息，开始对话吧</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <ScrollArea className="h-full" ref={rootRef}>
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
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {showJumpButton && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="回到底部"
          className="absolute bottom-4 right-4 h-9 w-9 rounded-full border border-border/60 bg-background/95 shadow-sm backdrop-blur"
          onClick={handleJumpToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
