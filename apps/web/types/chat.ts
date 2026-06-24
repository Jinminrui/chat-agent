import type {
  Conversation as SharedConversation,
  Message as SharedMessage,
} from "@chat-agent/shared";

export type ChatMessage = SharedMessage;

export type Conversation = SharedConversation;

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
