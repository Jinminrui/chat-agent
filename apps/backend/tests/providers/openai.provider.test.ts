import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { createOpenAIProvider } from "../../src/modules/providers/openai.provider";

vi.mock("openai");

const currentTimeToolDefinition = {
  name: "current-time",
  description: "Return the current server time.",
  parameters: {
    type: "object" as const,
    properties: {},
    additionalProperties: false,
  },
};

describe("openai provider mock mode", () => {
  it("returns a tool call for time questions when current-time is available", async () => {
    const previousApiKey = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;

    const provider = createOpenAIProvider();

    try {
      const result = await provider.stream({
        messages: [{ role: "user", content: "现在几点？" }],
        tools: [currentTimeToolDefinition],
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
        tools: [currentTimeToolDefinition],
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

describe("openai provider tool definitions", () => {
  it("maps tool descriptions and parameter schemas to OpenAI function tools", async () => {
    const previousApiKey = process.env.LLM_API_KEY;
    process.env.LLM_API_KEY = "test-key";

    const createMock = vi.fn().mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "ok" } }] };
      },
    });

    vi.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: createMock,
            },
          },
        }) as unknown as OpenAI,
    );

    const provider = createOpenAIProvider();

    try {
      await provider.stream({
        messages: [{ role: "user", content: "搜索一下" }],
        tools: [
          {
            name: "web-search",
            description: "Search the web for current information.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        ],
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "web-search",
                description: "Search the web for current information.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                  },
                  required: ["query"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: "auto",
        }),
      );
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.LLM_API_KEY;
      } else {
        process.env.LLM_API_KEY = previousApiKey;
      }
      vi.clearAllMocks();
    }
  });
});
