import { describe, expect, it, vi } from "vitest";
import { createOpenAIProvider } from "../../src/modules/providers/openai.provider";

describe("openai provider mock mode", () => {
  it("returns a tool call for time questions when current-time is available", async () => {
    const previousApiKey = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;

    const provider = createOpenAIProvider();

    try {
      const result = await provider.stream({
        messages: [{ role: "user", content: "现在几点？" }],
        tools: [{ name: "current-time" }],
      });

      expect(result).toEqual({
        type: "tool-call",
        toolName: "current-time",
        input: {},
        toolCallId: "mock-current-time-call",
      });
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.LLM_API_KEY;
      } else {
        process.env.LLM_API_KEY = previousApiKey;
      }
    }
  });

  it("turns current-time tool output into a final response in mock mode", async () => {
    const previousApiKey = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;

    const provider = createOpenAIProvider();

    try {
      const result = await provider.stream({
        messages: [
          {
            role: "tool",
            toolName: "current-time",
            toolCallId: "mock-current-time-call",
            content: JSON.stringify({ iso: "2026-06-24T06:00:00.000Z" }),
          },
        ],
        tools: [{ name: "current-time" }],
      });

      expect(result).toEqual({
        type: "final",
        content: "当前时间是 2026-06-24T06:00:00.000Z",
      });
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.LLM_API_KEY;
      } else {
        process.env.LLM_API_KEY = previousApiKey;
      }
    }
  });
});
