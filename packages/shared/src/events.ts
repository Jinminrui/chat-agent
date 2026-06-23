import type { ToolCallStatus } from "./contracts";

export type ChatStreamEvent =
  | { type: "assistant.delta"; delta: string }
  | {
      type: "tool.status";
      toolName: string;
      status: ToolCallStatus;
      label: string;
    }
  | { type: "assistant.done"; messageId: string }
  | { type: "error"; message: string };
