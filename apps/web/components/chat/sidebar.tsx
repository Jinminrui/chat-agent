"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, Plus, LogOut, Settings } from "lucide-react";
import type { Conversation } from "@chat-agent/shared";
import { logout } from "@/lib/api/auth";
import { listConversations, createConversation } from "@/lib/api/conversations";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    listConversations().then((items) => setConversations(items));
  }, []);

  const handleCreate = useCallback(async () => {
    const conv = await createConversation();
    setConversations((prev) => [conv, ...prev]);
    router.push(`/chat/${conv.id}`);
  }, [router]);

  const handleLogout = useCallback(async () => {
    await logout();
    setConversations([]);
    router.replace("/login");
  }, [router]);

  const isActive = (convId: string) => pathname === `/chat/${convId}`;

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <MessageSquare className="h-4 w-4 text-primary/80" />
          </div>
          <span className="text-sm font-medium tracking-tight">Chat Agent</span>
        </div>
        <Button
          onClick={handleCreate}
          className="mt-1 w-full rounded-xl"
          size="sm"
          variant="outline"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          新建会话
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((conv) => (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    onClick={() => router.push(`/chat/${conv.id}`)}
                    className={cn(
                      "rounded-xl text-sm transition-all",
                      isActive(conv.id)
                        ? "bg-muted/60 text-foreground"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              />
            }
          >
            <Settings className="mr-2 h-3.5 w-3.5" />
            <span className="text-sm">设置</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem className="rounded-lg">
              <Settings className="mr-2 h-4 w-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
