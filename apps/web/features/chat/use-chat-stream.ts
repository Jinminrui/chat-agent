import { useState, useCallback, useRef } from "react";
import type { ChatStreamEvent } from "@chat-agent/shared";
import { streamChat } from "@/lib/api/chat";

export type ProcessStatus = {
  toolName?: string;
  status: "running" | "success" | "error";
  label: string;
};

export function useChatStream(opts?: { onComplete?: (response: string) => void }) {
  const [streaming, setStreaming] = useState(false);
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  const accumulatedRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const send = useCallback(
    async (conversationId: string, message: string) => {
      setStreaming(true);
      setDelta("");
      setError(null);
      setProcessStatus({ status: "running", label: "正在思考..." });
      accumulatedRef.current = "";

      try {
        await streamChat(
          { conversationId, message },
          {
            onEvent(event: ChatStreamEvent) {
              if (event.event === "delta") {
                accumulatedRef.current += event.data.content;
                setDelta(accumulatedRef.current);
                setProcessStatus({
                  status: "running",
                  label: "正在生成回答...",
                });
              } else if (event.event === "tool.start") {
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "running",
                  label: `正在调用 ${event.data.toolName}...`,
                });
              } else if (event.event === "tool.end") {
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "success",
                  label: `${event.data.toolName} 调用完成`,
                });
              } else if (event.event === "error") {
                throw new Error(event.data.msg);
              }
            },
            onComplete() {
              setProcessStatus(null);
              setStreaming(false);
              optsRef.current?.onComplete?.(accumulatedRef.current);
            },
          },
        );
      } catch (err) {
        setProcessStatus(null);
        setError(err instanceof Error ? err.message : "Unknown error");
        setStreaming(false);
      }
    },
    [],
  );

  return { streaming, delta, error, processStatus, send };
}
