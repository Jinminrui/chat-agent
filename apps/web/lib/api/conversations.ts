import { api } from './client';
import type { Conversation, ChatMessage, CreateConversationResponse, ListConversationsResponse, ListMessagesResponse } from '@/types/chat';

/**
 * 创建新会话
 *
 * @returns 新创建的会话信息（包含生成的 ID 和标题）
 */
export async function createConversation(): Promise<Conversation> {
  const response = await api.post<CreateConversationResponse>('/api/conversations', {});
  return response.data.conversation;
}

/**
 * 获取会话列表
 *
 * @returns 用户的所有会话，按创建时间倒序排列
 */
export async function listConversations(): Promise<Conversation[]> {
  const response = await api.get<ListConversationsResponse>('/api/conversations');
  return response.data.items;
}

/**
 * 获取会话的历史消息
 *
 * @param conversationId - 会话 ID
 * @returns 该会话的所有消息，按时间正序排列
 */
export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const response = await api.get<ListMessagesResponse>(`/api/conversations/${conversationId}/messages`);
  return response.data.items;
}
