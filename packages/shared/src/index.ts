export type MessageRole = "user" | "assistant";

export type ChatStreamEvent =
  | { type: "assistant.delta"; delta: string }
  | {
      type: "tool.status";
      toolName: string;
      status: "running" | "success" | "error";
      label: string;
    }
  | { type: "assistant.done"; messageId: string }
  | { type: "error"; message: string };
