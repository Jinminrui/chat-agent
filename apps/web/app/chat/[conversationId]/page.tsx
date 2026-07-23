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

/**
 * 生成本地临时消息 ID
 *
 * 用于在流式响应完成前，为用户消息和流式助手消息生成临时 ID。
 * 优先使用 crypto.randomUUID()，降级为时间戳 + 随机数。
 */
function createLocalMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 会话页面组件
 *
 * 核心职责：
 * - 鉴权检查：验证用户登录状态，未登录跳转登录页
 * - 消息管理：加载历史消息、添加本地消息、合并流式响应
 * - 流式聊天：集成 useChatStream hook，实时显示流式响应
 * - 自动发送：支持通过 URL 参数 message 自动发送消息
 *
 * 消息流：
 * 1. 用户发送消息 → 立即添加到本地消息列表（乐观更新）
 * 2. 调用 send() → 流式接收助手响应，实时显示在页面
 * 3. 流完成 → 将完整响应添加到消息列表
 */
export default function ConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  /** 鉴权是否完成 */
  const [authReady, setAuthReady] = useState(false);
  /** 历史消息是否加载完成 */
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  /** 防止自动消息重复发送的标记 */
  const autoMessageSentRef = useRef(false);

  // 鉴权检查：验证用户是否已登录
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

  /** 流完成回调：将完整响应添加到消息列表 */
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

  // 加载历史消息：鉴权完成后加载该会话的历史消息
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

  /** 发送消息：乐观更新 + 调用流式接口 */
  const handleSend = useCallback(
    (message: string) => {
      // 乐观更新：立即显示用户消息
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

  /** 流式助手消息的临时 ID，用于关联 processStatus */
  const streamingMessageId = `streaming-assistant-${conversationId}`;

  /**
   * 可见消息列表
   *
   * 流式响应期间，在消息列表末尾追加一个临时的助手消息，
   * 内容为当前累积的流式文本（delta）。
   * 流完成后，该临时消息会被替换为正式消息。
   */
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

  /**
   * 自动发送消息
   *
   * 支持通过 URL 参数 message 自动发送消息（如从其他页面跳转过来）。
   * 使用 autoMessageSentRef 防止在 Strict Mode 下重复发送。
   */
  useEffect(() => {
    if (!authReady || !messagesLoaded) return;

    const message = searchParams.get("message");
    if (!message || autoMessageSentRef.current) return;

    autoMessageSentRef.current = true;
    // 清除 URL 参数，避免刷新页面时重复发送
    router.replace(pathname, { scroll: false });
    handleSend(message);
  }, [searchParams, pathname, router, handleSend]);

  // 加载中：显示空白页面
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
