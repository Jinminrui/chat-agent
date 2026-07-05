import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatStream } from "@/features/chat/use-chat-stream";

vi.mock("@/lib/api/chat", () => ({
  streamChat: vi.fn(),
}));

import { streamChat } from "@/lib/api/chat";
const mockStreamChat = vi.mocked(streamChat);

describe("useChatStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with streaming=false, delta empty, error null", () => {
    const { result } = renderHook(() => useChatStream());

    expect(result.current.streaming).toBe(false);
    expect(result.current.delta).toBe("");
    expect(result.current.error).toBeNull();
  });

  it("sets streaming=true when send is called", async () => {
    mockStreamChat.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useChatStream());

    act(() => {
      result.current.send("conv-1", "Hello");
    });

    expect(result.current.streaming).toBe(true);
  });

  it("sets process status to thinking when send starts", async () => {
    mockStreamChat.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChatStream());

    act(() => {
      result.current.send("conv-1", "Hi");
    });

    expect(result.current.processStatus).toEqual({
      status: "running",
      label: "正在思考...",
    });
  });

  it("accumulates delta from assistant.delta events", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "Hello" } });
      handlers.onEvent({ event: "delta", id: 2, data: { content: " world" } });
      handlers.onComplete?.();
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "Hi");
    });

    expect(result.current.delta).toBe("Hello world");
    expect(result.current.streaming).toBe(false);
  });

  it("sets process status when a tool starts", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({
        event: "tool.start",
        id: 1,
        data: { toolName: "web-search", input: { query: "天气" } },
      });
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "查天气");
    });

    expect(result.current.processStatus).toEqual({
      toolName: "web-search",
      status: "running",
      label: "正在调用 web-search...",
    });
  });

  it("sets process status when a tool finishes", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({
        event: "tool.end",
        id: 2,
        data: { toolName: "web-search", output: { results: [] } },
      });
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "查天气");
    });

    expect(result.current.processStatus).toEqual({
      toolName: "web-search",
      status: "success",
      label: "web-search 调用完成",
    });
  });

  it("sets process status to generating when assistant content arrives", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "你好" } });
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "Hi");
    });

    expect(result.current.delta).toBe("你好");
    expect(result.current.processStatus).toEqual({
      status: "running",
      label: "正在生成回答...",
    });
  });

  it("sets error and streaming=false when streamChat throws", async () => {
    mockStreamChat.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "Hi");
    });

    expect(result.current.error).toBe("Network failure");
    expect(result.current.streaming).toBe(false);
    expect(result.current.processStatus).toBeNull();
  });

  it("calls onComplete callback with accumulated response", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "Hi" } });
      handlers.onEvent({ event: "delta", id: 2, data: { content: " there" } });
      handlers.onComplete?.();
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useChatStream({ onComplete }));

    await act(async () => {
      await result.current.send("conv-1", "Hello");
    });

    expect(onComplete).toHaveBeenCalledWith("Hi there");
    expect(result.current.processStatus).toBeNull();
  });

  it("resets delta and error on new send", async () => {
    mockStreamChat.mockRejectedValueOnce(new Error("fail"));
    mockStreamChat.mockImplementationOnce(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "ok" } });
      handlers.onComplete?.();
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "msg1");
    });
    expect(result.current.error).toBe("fail");

    await act(async () => {
      await result.current.send("conv-1", "msg2");
    });
    expect(result.current.error).toBeNull();
    expect(result.current.delta).toBe("ok");
  });
});
