import { useState, useCallback, useRef } from "react";
import type { ChatStreamEvent } from "@chat-agent/shared";
import { streamChat } from "@/lib/api/chat";

export function useChatStream(opts?: { onComplete?: (response: string) => void }) {
  const [streaming, setStreaming] = useState(false);
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const accumulatedRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const send = useCallback(
    async (conversationId: string, message: string) => {
      setStreaming(true);
      setDelta("");
      setError(null);
      accumulatedRef.current = "";

      try {
        await streamChat(
          { conversationId, message },
          {
            onEvent(event: ChatStreamEvent) {
              if (event.type === "assistant.delta") {
                accumulatedRef.current += event.delta;
                setDelta(accumulatedRef.current);
              }
            },
            onComplete() {
              setStreaming(false);
              optsRef.current?.onComplete?.(accumulatedRef.current);
            },
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStreaming(false);
      }
    },
    [],
  );

  return { streaming, delta, error, send };
}
