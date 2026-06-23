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

  it("accumulates delta from assistant.delta events", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ type: "assistant.delta", delta: "Hello" });
      handlers.onEvent({ type: "assistant.delta", delta: " world" });
      handlers.onComplete?.();
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "Hi");
    });

    expect(result.current.delta).toBe("Hello world");
    expect(result.current.streaming).toBe(false);
  });

  it("sets error and streaming=false when streamChat throws", async () => {
    mockStreamChat.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "Hi");
    });

    expect(result.current.error).toBe("Network failure");
    expect(result.current.streaming).toBe(false);
  });

  it("calls onComplete callback with accumulated response", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ type: "assistant.delta", delta: "Hi" });
      handlers.onEvent({ type: "assistant.delta", delta: " there" });
      handlers.onComplete?.();
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useChatStream({ onComplete }));

    await act(async () => {
      await result.current.send("conv-1", "Hello");
    });

    expect(onComplete).toHaveBeenCalledWith("Hi there");
  });

  it("resets delta and error on new send", async () => {
    mockStreamChat.mockRejectedValueOnce(new Error("fail"));
    mockStreamChat.mockImplementationOnce(async (_input, handlers) => {
      handlers.onEvent({ type: "assistant.delta", delta: "ok" });
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
