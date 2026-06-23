import { describe, expect, it, vi } from "vitest";
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
