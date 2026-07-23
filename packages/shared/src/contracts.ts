/**
 * 用户类型
 *
 * 包含用户的基本信息，用于认证和用户展示。
 */
export type User = {
  /** 用户唯一标识 */
  id: string;
  /** 用户邮箱（唯一） */
  email: string;
  /** 用户名（可选，唯一） */
  username?: string;
  /** 账号创建时间 */
  createdAt: string;
};

/**
 * 会话类型
 *
 * 表示一个聊天会话，包含会话元信息。
 */
export type Conversation = {
  /** 会话唯一标识 */
  id: string;
  /** 所属用户 ID */
  userId: string;
  /** 会话标题（通常由第一条消息生成） */
  title: string;
  /** 会话创建时间 */
  createdAt: string;
  /** 会话最后更新时间 */
  updatedAt: string;
};

/**
 * 消息类型
 *
 * 表示会话中的一条消息，可以是用户消息或助手消息。
 */
export type Message = {
  /** 消息唯一标识 */
  id: string;
  /** 所属会话 ID */
  conversationId: string;
  /** 消息角色：用户或助手 */
  role: "user" | "assistant";
  /** 消息内容（助手消息支持 Markdown 格式） */
  content: string;
  /** 消息创建时间 */
  createdAt: string;
};

/**
 * 工具调用状态
 *
 * 用于表示 Agent 调用工具时的执行状态。
 */
export type ToolCallStatus = "running" | "success" | "error";
