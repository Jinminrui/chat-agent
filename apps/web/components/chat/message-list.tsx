"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageRow } from "./message-row";
import type { Message } from "@chat-agent/shared";
import type { ProcessStatus } from "@/features/chat/use-chat-stream";

/** MessageList 组件的属性 */
interface MessageListProps {
  /** 消息列表 */
  messages: Message[];
  /** 当前流式响应的处理状态（如搜索中、思考中等） */
  processStatus?: ProcessStatus | null;
  /** 当前正在流式接收的消息 ID，用于关联 processStatus */
  streamingMessageId?: string | null;
}

/**
 * 消息列表组件
 *
 * 功能：
 * - 渲染消息列表，支持自动滚动
 * - 当用户滚动到底部附近时自动锁定，新消息到来时自动滚动
 * - 当用户向上滚动时显示"回到底部"按钮
 * - 为正在流式接收的消息显示处理状态（如搜索中、思考中）
 */
export function MessageList({
  messages,
  processStatus,
  streamingMessageId,
}: MessageListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  /** 是否锁定在底部（用户未手动向上滚动） */
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  /** 是否显示"回到底部"跳转按钮 */
  const [showJumpButton, setShowJumpButton] = useState(false);

  /** 获取 ScrollArea 的视口元素 */
  const getViewport = useCallback(
    () =>
      rootRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      ) ?? null,
    [],
  );

  /** 滚动到底部锚点 */
  const scrollToBottom = useCallback((behavior?: ScrollBehavior) => {
    if (typeof bottomRef.current?.scrollIntoView !== "function") {
      return;
    }

    bottomRef.current.scrollIntoView(
      behavior ? { block: "end", behavior } : { block: "end" },
    );
  }, []);

  /** 判断当前滚动位置是否接近底部（阈值 80px） */
  const isNearBottom = useCallback((viewport: HTMLElement) => {
    return (
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 80
    );
  }, []);

  // 监听滚动事件，更新底部锁定状态
  useEffect(() => {
    const viewport = getViewport();

    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      const nearBottom = isNearBottom(viewport);

      setIsPinnedToBottom(nearBottom);
      // 滚动到底部时隐藏跳转按钮
      if (nearBottom) {
        setShowJumpButton(false);
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [getViewport, isNearBottom]);

  // 消息变化时：锁定底部则自动滚动，否则显示跳转按钮
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

  /** 点击跳转按钮：锁定底部并平滑滚动 */
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
              // 只有当前正在流式接收的助手消息才显示 processStatus
              processStatus={
                msg.role === "assistant" &&
                processStatus &&
                msg.id === streamingMessageId
                  ? processStatus
                  : undefined
              }
            />
          ))}
          {/* 底部锚点，用于 scrollIntoView 定位 */}
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
