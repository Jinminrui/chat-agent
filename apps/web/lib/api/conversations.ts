import type { Conversation, Message } from "@chat-agent/shared";
import { apiRequest } from "./client";

export async function createConversation(): Promise<Conversation> {
  return apiRequest<Conversation>("/conversations", {
    method: "POST",
  });
}

export async function listConversations(): Promise<{ items: Conversation[] }> {
  return apiRequest<{ items: Conversation[] }>("/conversations");
}

export async function listMessages(conversationId: string): Promise<{ items: Message[] }> {
  return apiRequest<{ items: Message[] }>(`/conversations/${conversationId}/messages`);
}
