"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/chat/sidebar";
import { Composer } from "@/components/chat/composer";
import { EmptyState } from "@/components/chat/empty-state";
import { getMe } from "@/lib/api/auth";
import { createConversation } from "@/lib/api/conversations";

/**
 * 聊天主页组件
 *
 * 这是新会话的入口页面，功能包括：
 * - 鉴权检查：验证用户登录状态
 * - 显示空状态：展示欢迎信息和建议提示
 * - 创建新会话：用户发送消息时自动创建新会话并跳转
 * - 支持建议点击：点击建议提示直接创建会话
 *
 * 工作流程：
 * 1. 用户在空状态页面输入消息或点击建议
 * 2. 调用 createConversation() 创建新会话
 * 3. 跳转到 /chat/[conversationId]?message=xxx
 * 4. 会话页面自动发送消息
 */
export default function ChatPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

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
  }, [router]);

  // 加载中：显示空白页面
  if (!authReady) {
    return null;
  }

  /**
   * 处理消息发送
   *
   * 创建新会话并跳转，通过 URL 参数传递消息内容。
   * 会话页面会自动读取并发送该消息。
   */
  async function handleMessage(message: string) {
    const conversation = await createConversation();
    router.push(`/chat/${conversation.id}?message=${encodeURIComponent(message)}`);
  }

  /** 处理建议点击：直接调用 handleMessage */
  function handleSuggestionClick(suggestion: string) {
    handleMessage(suggestion);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <header className="flex h-12 items-center gap-2 border-b border-border/40 px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <h1 className="text-sm font-medium text-foreground/80">新会话</h1>
          </header>
          <main className="flex-1 overflow-hidden">
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          </main>
          <Composer onSubmit={handleMessage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
