import type { ChatStreamEvent } from "@chat-agent/shared";

export async function streamChat(
  input: { conversationId: string; message: string },
  handlers: {
    onEvent: (event: ChatStreamEvent) => void;
    onComplete?: () => void;
  },
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split("\n").filter((line) => line.startsWith("data: "));

  for (const line of lines) {
    handlers.onEvent(JSON.parse(line.slice(6)));
  }

  handlers.onComplete?.();
}
