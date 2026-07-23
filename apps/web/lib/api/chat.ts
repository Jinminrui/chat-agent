import type { ChatStreamEvent } from "@chat-agent/shared";

/**
 * SSE 流式聊天客户端
 *
 * 手动解析 SSE（Server-Sent Events）文本协议，处理：
 * - event: 事件类型（delta/tool.start/tool.end/done/error/heartbeat）
 * - id: 事件序列号
 * - data: JSON 格式的事件数据
 *
 * SSE 协议格式：
 * ```
 * event: delta
 * id: 1
 * data: {"content": "你好"}
 *
 * ```
 *
 * 空行表示一个完整事件的结束。
 */
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
  /** 缓冲区：处理跨 chunk 的不完整行 */
  let buffer = '';
  /** 当前正在解析的事件，累积 event/id/data 三个字段 */
  let currentEvent: { event?: string; id?: number; data?: string } = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 将二进制 chunk 解码为文本，追加到缓冲区
    buffer += decoder.decode(value, { stream: true });
    // 按换行分割，最后一行可能不完整，保留在缓冲区
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
        // 空行 = 事件结束：解析 JSON 并触发回调
        handlers.onEvent({
          event: currentEvent.event as ChatStreamEvent['event'],
          id: currentEvent.id!,
          data: JSON.parse(currentEvent.data),
        });
        // 重置，开始解析下一个事件
        currentEvent = {};
      }
    }
  }

  // 流结束：处理缓冲区中可能残留的最后一个事件
  if (currentEvent.event && currentEvent.data) {
    handlers.onEvent({
      event: currentEvent.event as ChatStreamEvent['event'],
      id: currentEvent.id!,
      data: JSON.parse(currentEvent.data),
    });
  }

  handlers.onComplete?.();
}
