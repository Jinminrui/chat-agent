import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamChat } from "@/lib/api/chat";

describe("streamChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses SSE data lines and calls onEvent for each", async () => {
    const sseBody = [
      "event: delta",
      "id: 1",
      'data: {"content":"Hello"}',
      "",
      "event: delta",
      "id: 2",
      'data: {"content":" world"}',
      "",
      "event: done",
      "id: 3",
      'data: {"messageId":"msg-1"}',
      "",
    ].join("\n");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseBody));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    const onEvent = vi.fn();
    const onComplete = vi.fn();

    await streamChat({ conversationId: "conv-1", message: "Hi" }, { onEvent, onComplete });

    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(onEvent).toHaveBeenCalledWith({ event: "delta", id: 1, data: { content: "Hello" } });
    expect(onEvent).toHaveBeenCalledWith({ event: "delta", id: 2, data: { content: " world" } });
    expect(onEvent).toHaveBeenCalledWith({ event: "done", id: 3, data: { messageId: "msg-1" } });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores non-data lines in SSE body", async () => {
    const sseBody = [
      "event: delta",
      "id: 123",
      'data: {"content":"test"}',
      "",
    ].join("\n");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseBody));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    const onEvent = vi.fn();
    await streamChat({ conversationId: "conv-1", message: "Hi" }, { onEvent });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ event: "delta", id: 123, data: { content: "test" } });
  });

  it("does not log raw SSE chunks during a successful stream", async () => {
    const sseBody = [
      "event: delta",
      "id: 1",
      'data: {"content":"Hello"}',
      "",
      "event: done",
      "id: 2",
      'data: {"messageId":"msg-1"}',
      "",
    ].join("\n");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseBody));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await streamChat(
      { conversationId: "conv-1", message: "Hi" },
      { onEvent: vi.fn() },
    );

    expect(consoleLog).not.toHaveBeenCalled();
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
