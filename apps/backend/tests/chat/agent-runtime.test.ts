import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAgentRuntime } from "../../src/modules/chat/agent-runtime";
import { createToolRegistry } from "../../src/modules/tools/tool-registry";

describe("agent runtime", () => {
  it("runs a requested tool and returns the final assistant message", async () => {
    const provider = {
      stream: vi
        .fn()
        .mockResolvedValueOnce({
          type: "tool-call",
          toolName: "current_time",
          input: {},
        })
        .mockResolvedValueOnce({
          type: "final",
          content: "现在是 10:00。",
        }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 3,
    });

    const result = await runtime.run({
      messages: [{ role: "user", content: "现在几点？" }],
    });

    expect(result.content).toBe("现在是 10:00。");
    expect(result.toolCalls).toHaveLength(1);
    expect(provider.stream).toHaveBeenCalledTimes(2);

    const secondCall = vi.mocked(provider.stream).mock.calls[1]?.[0];
    expect(secondCall?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          toolName: "current_time",
          content: JSON.stringify({ iso: "2026-06-23T10:00:00.000Z" }),
        }),
      ]),
    );
  });

  it("throws when tool calls exceed the configured limit", async () => {
    const provider = {
      stream: vi.fn().mockResolvedValue({
        type: "tool-call",
        toolName: "current_time",
        input: {},
      }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 1,
    });

    await expect(
      runtime.run({
        messages: [{ role: "user", content: "一直调用工具" }],
      }),
    ).rejects.toMatchObject({
      name: "MAX_TOOL_CALLS_EXCEEDED",
      message: "MAX_TOOL_CALLS_EXCEEDED",
      code: "MAX_TOOL_CALLS_EXCEEDED",
    });
  });

  it("only treats own properties as registered tools", () => {
    const registry = createToolRegistry({
      current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
    });

    expect(registry.has("current_time")).toBe(true);
    expect(registry.has("toString")).toBe(false);
    expect(registry.has("constructor")).toBe(false);
  });
});

describe("agent runtime with checkpoints", () => {
  function createMockCheckpointService() {
    return {
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(null),
    };
  }

  it("saves checkpoint after each tool call when checkpointService and conversationId are provided", async () => {
    const checkpointService = createMockCheckpointService();
    const provider = {
      stream: vi
        .fn()
        .mockResolvedValueOnce({
          type: "tool-call",
          toolName: "current_time",
          input: {},
        })
        .mockResolvedValueOnce({
          type: "tool-call",
          toolName: "current_time",
          input: {},
        })
        .mockResolvedValueOnce({
          type: "final",
          content: "done",
        }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 5,
      checkpointService,
    });

    await runtime.run({
      messages: [{ role: "user", content: "hi" }],
      conversationId: "conv-1",
    });

    expect(checkpointService.save).toHaveBeenCalledTimes(2);
    expect(checkpointService.save).toHaveBeenNthCalledWith(
      1,
      "conv-1",
      1,
      expect.any(Array),
    );
    expect(checkpointService.save).toHaveBeenNthCalledWith(
      2,
      "conv-1",
      2,
      expect.any(Array),
    );
  });

  it("does not save checkpoint when conversationId is not provided", async () => {
    const checkpointService = createMockCheckpointService();
    const provider = {
      stream: vi
        .fn()
        .mockResolvedValueOnce({
          type: "tool-call",
          toolName: "current_time",
          input: {},
        })
        .mockResolvedValueOnce({
          type: "final",
          content: "done",
        }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 5,
      checkpointService,
    });

    await runtime.run({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(checkpointService.save).not.toHaveBeenCalled();
  });

  it("does not save checkpoint when checkpointService is not provided", async () => {
    const provider = {
      stream: vi
        .fn()
        .mockResolvedValueOnce({
          type: "tool-call",
          toolName: "current_time",
          input: {},
        })
        .mockResolvedValueOnce({
          type: "final",
          content: "done",
        }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 5,
    });

    await runtime.run({
      messages: [{ role: "user", content: "hi" }],
      conversationId: "conv-1",
    });

    // No error thrown, just no checkpoint saved
  });

  it("resumes from checkpoint by loading saved messages", async () => {
    const checkpointService = createMockCheckpointService();
    checkpointService.load.mockResolvedValue({
      id: "cp-1",
      conversationId: "conv-1",
      messageIndex: 1,
      state: {
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "", toolName: "current_time" },
          {
            role: "tool",
            toolName: "current_time",
            content: JSON.stringify({ iso: "2026-06-23T10:00:00.000Z" }),
          },
        ],
      },
      createdAt: new Date(),
    });

    const provider = {
      stream: vi.fn().mockResolvedValueOnce({
        type: "final",
        content: "现在是 10:00。",
      }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 5,
      checkpointService,
    });

    const result = await runtime.run({
      messages: [{ role: "user", content: "original message" }],
      conversationId: "conv-1",
    });

    expect(checkpointService.load).toHaveBeenCalledWith("conv-1");
    expect(result.content).toBe("现在是 10:00。");

    // Provider should be called with checkpoint messages, not original
    const providerCall = vi.mocked(provider.stream).mock.calls[0]?.[0];
    expect(providerCall?.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "", toolName: "current_time" },
      {
        role: "tool",
        toolName: "current_time",
        content: JSON.stringify({ iso: "2026-06-23T10:00:00.000Z" }),
      },
    ]);
  });

  it("continues with original messages when no checkpoint exists", async () => {
    const checkpointService = createMockCheckpointService();
    checkpointService.load.mockResolvedValue(null);

    const provider = {
      stream: vi.fn().mockResolvedValueOnce({
        type: "final",
        content: "done",
      }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 5,
      checkpointService,
    });

    await runtime.run({
      messages: [{ role: "user", content: "original message" }],
      conversationId: "conv-1",
    });

    expect(checkpointService.load).toHaveBeenCalledWith("conv-1");

    // Provider should be called with original messages
    const providerCall = vi.mocked(provider.stream).mock.calls[0]?.[0];
    expect(providerCall?.messages).toEqual([
      { role: "user", content: "original message" },
    ]);
  });
});
