export type ChatMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type SendMessageRequest = {
  conversationId: string;
  message: string;
};

export type CreateConversationResponse = {
  conversation: Conversation;
};

export type ListConversationsResponse = {
  items: Conversation[];
};

export type ListMessagesResponse = {
  items: ChatMessage[];
};
