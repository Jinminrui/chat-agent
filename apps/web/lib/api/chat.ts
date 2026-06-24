import type { ChatStreamEvent } from "@chat-agent/shared";

export async function streamChat(
  input: { conversationId: string; message: string },
  handlers: {
    onEvent: (event: ChatStreamEvent) => void;
    onComplete?: () => void;
  },
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/stream`, {
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

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent: { event?: string; id?: number; data?: string } = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    console.log('Received chunk:', buffer);
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent.event = line.slice(7);
      } else if (line.startsWith('id: ')) {
        currentEvent.id = parseInt(line.slice(4));
      } else if (line.startsWith('data: ')) {
        currentEvent.data = line.slice(6);
      } else if (line === '' && currentEvent.event && currentEvent.data) {
        handlers.onEvent({
          event: currentEvent.event as ChatStreamEvent['event'],
          id: currentEvent.id!,
          data: JSON.parse(currentEvent.data),
        });
        currentEvent = {};
      }
    }
  }

  // Process any remaining data in buffer
  if (currentEvent.event && currentEvent.data) {
    handlers.onEvent({
      event: currentEvent.event as ChatStreamEvent['event'],
      id: currentEvent.id!,
      data: JSON.parse(currentEvent.data),
    });
  }

  handlers.onComplete?.();
}
