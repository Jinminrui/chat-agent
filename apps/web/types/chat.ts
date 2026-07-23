import type {
  Conversation as SharedConversation,
  Message as SharedMessage,
} from "@chat-agent/shared";

/** 聊天消息类型（从 shared 包重新导出） */
export type ChatMessage = SharedMessage;

/** 会话类型（从 shared 包重新导出） */
export type Conversation = SharedConversation;

/** 发送消息请求参数 */
export type SendMessageRequest = {
  /** 会话 ID */
  conversationId: string;
  /** 消息内容 */
  message: string;
};

/** 创建会话响应数据 */
export type CreateConversationResponse = {
  /** 新创建的会话信息 */
  conversation: Conversation;
};

/** 获取会话列表响应数据 */
export type ListConversationsResponse = {
  /** 会话列表 */
  items: Conversation[];
};

/** 获取消息列表响应数据 */
export type ListMessagesResponse = {
  /** 消息列表 */
  items: ChatMessage[];
};
