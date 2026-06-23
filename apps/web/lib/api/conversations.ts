import type { Conversation, Message } from "@chat-agent/shared";
import { apiRequest } from "./client";

export async function createConversation(): Promise<Conversation> {
  const response = await apiRequest<{ conversation: Conversation }>("/conversations", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return response.conversation;
}

export async function listConversations(): Promise<{ items: Conversation[] }> {
  return apiRequest<{ items: Conversation[] }>("/conversations");
}

export async function listMessages(conversationId: string): Promise<{ items: Message[] }> {
  return apiRequest<{ items: Message[] }>(`/conversations/${conversationId}/messages`);
}
