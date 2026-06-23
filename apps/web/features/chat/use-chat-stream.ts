import { useState, useCallback } from "react";
import type { ChatStreamEvent } from "@chat-agent/shared";
import { streamChat } from "@/lib/api/chat";

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [delta, setDelta] = useState("");

  const send = useCallback(
    async (conversationId: string, message: string) => {
      setStreaming(true);
      setDelta("");

      await streamChat(
        { conversationId, message },
        {
          onEvent(event: ChatStreamEvent) {
            if (event.type === "assistant.delta") {
              setDelta((prev) => prev + event.delta);
            }
          },
          onComplete() {
            setStreaming(false);
          },
        },
      );
    },
    [],
  );

  return { streaming, delta, send };
}
