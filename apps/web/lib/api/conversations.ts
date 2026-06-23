import { api } from './client';
import type { Conversation, ChatMessage, CreateConversationResponse, ListConversationsResponse, ListMessagesResponse } from '@/types/chat';

export async function createConversation(): Promise<Conversation> {
  const response = await api.post<CreateConversationResponse>('/api/conversations', {});
  return response.data.conversation;
}

export async function listConversations(): Promise<Conversation[]> {
  const response = await api.get<ListConversationsResponse>('/api/conversations');
  return response.data.items;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const response = await api.get<ListMessagesResponse>(`/api/conversations/${conversationId}/messages`);
  return response.data.items;
}
