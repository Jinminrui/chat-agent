"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, LogOut, Settings } from "lucide-react";
import type { Conversation } from "@chat-agent/shared";
import { listConversations, createConversation } from "@/lib/api/conversations";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) return;
    listConversations().then((data) => setConversations(data.items));
  }, []);

  const handleCreate = useCallback(async () => {
    const conv = await createConversation();
    setConversations((prev) => [conv, ...prev]);
    router.push(`/chat/${conv.id}`);
  }, [router]);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Chat Agent</span>
        </div>
        <Button onClick={handleCreate} className="w-full" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          新建会话
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>历史会话</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((conv) => (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    onClick={() => router.push(`/chat/${conv.id}`)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{conv.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="w-full justify-start" />}
          >
            <Settings className="mr-2 h-4 w-4" />
            设置
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
