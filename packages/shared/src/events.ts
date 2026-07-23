import type { ToolCallStatus } from "./contracts";

/**
 * SSE 聊天流事件类型
 *
 * 定义了后端向前端推送的所有事件类型，用于流式聊天通信。
 * 事件通过 SSE（Server-Sent Events）协议传输，格式为：
 * ```
 * event: <event-type>
 * id: <sequence-number>
 * data: <json-data>
 * ```
 */
export type ChatStreamEvent =
  /** 文本片段：LLM 生成的增量文本内容 */
  | { event: "delta"; id: number; data: { content: string } }
  /** 工具开始：Agent 开始调用工具（如 web_search、fetch_url） */
  | { event: "tool.start"; id: number; data: { toolName: string; input: unknown } }
  /** 工具完成：工具调用结束，返回执行结果 */
  | { event: "tool.end"; id: number; data: { toolName: string; output: unknown } }
  /** 流结束：整个对话响应完成，包含消息 ID 和 token 使用量 */
  | { event: "done"; id: number; data: { messageId: string; totalTokens?: number } }
  /** 错误：发生错误，包含错误码和错误信息 */
  | { event: "error"; id: number; data: { code: number; msg: string } }
  /** 心跳：保持连接活跃，防止超时断开 */
  | { event: "heartbeat"; id: number; data: { timestamp: number } };
