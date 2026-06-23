import type { ToolCallStatus } from "./contracts";

export type ChatStreamEvent =
  | { event: "delta"; id: number; data: { content: string } }
  | { event: "tool.start"; id: number; data: { toolName: string; input: unknown } }
  | { event: "tool.end"; id: number; data: { toolName: string; output: unknown } }
  | { event: "done"; id: number; data: { messageId: string; totalTokens?: number } }
  | { event: "error"; id: number; data: { code: number; msg: string } }
  | { event: "heartbeat"; id: number; data: { timestamp: number } };
