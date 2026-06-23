import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamChat } from "@/lib/api/chat";

describe("streamChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses SSE data lines and calls onEvent for each", async () => {
    const sseBody = [
      'data: {"type":"assistant.delta","delta":"Hello"}',
      'data: {"type":"assistant.delta","delta":" world"}',
      'data: {"type":"assistant.done","messageId":"msg-1"}',
      "",
    ].join("\n");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sseBody),
      }),
    );

    const onEvent = vi.fn();
    const onComplete = vi.fn();

    await streamChat({ conversationId: "conv-1", message: "Hi" }, { onEvent, onComplete });

    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(onEvent).toHaveBeenCalledWith({ type: "assistant.delta", delta: "Hello" });
    expect(onEvent).toHaveBeenCalledWith({ type: "assistant.delta", delta: " world" });
    expect(onEvent).toHaveBeenCalledWith({ type: "assistant.done", messageId: "msg-1" });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores non-data lines in SSE body", async () => {
    const sseBody = [
      "event: message",
      'data: {"type":"assistant.delta","delta":"test"}',
      "id: 123",
      "",
    ].join("\n");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sseBody),
      }),
    );

    const onEvent = vi.fn();
    await streamChat({ conversationId: "conv-1", message: "Hi" }, { onEvent });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: "assistant.delta", delta: "test" });
  });

  it("throws on non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      }),
    );

    const onEvent = vi.fn();
    const onComplete = vi.fn();

    await expect(
      streamChat({ conversationId: "conv-1", message: "Hi" }, { onEvent, onComplete }),
    ).rejects.toThrow("HTTP 500");

    expect(onEvent).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("throws on 4xx HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      }),
    );

    await expect(
      streamChat({ conversationId: "conv-1", message: "Hi" }, { onEvent: vi.fn() }),
    ).rejects.toThrow("HTTP 401");
  });
});
