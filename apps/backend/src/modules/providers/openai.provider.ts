/**
 * OpenAI-compatible provider.
 *
 * Uses the OpenAI API format to call LLM models.
 * Supports custom base URLs for compatible providers.
 * Falls back to mock implementation when no API key is configured.
 */

import OpenAI from "openai";
import type { FastifyBaseLogger } from "fastify";
import type {
  ChatProvider,
  ProviderMessage,
  ProviderToolDefinition,
} from "./provider.types";

type CreateOpenAIProviderOptions = {
  logger?: FastifyBaseLogger;
};

function parseToolInput(argumentsText: string | undefined) {
  if (!argumentsText) {
    return {};
  }

  try {
    const parsed = JSON.parse(argumentsText);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function toOpenAITools(tools: ProviderToolDefinition[] = []) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function toOpenAIMessages(messages: ProviderMessage[]) {
  return messages.map((message) => {
    if (message.role === "assistant" && message.toolName && message.toolCallId) {
      return {
        role: "assistant" as const,
        content: message.content || "",
        tool_calls: [
          {
            id: message.toolCallId,
            type: "function" as const,
            function: {
              name: message.toolName,
              arguments: JSON.stringify(message.toolInput ?? {}),
            },
          },
        ],
      };
    }

    if (message.role === "tool") {
      return {
        role: "tool" as const,
        tool_call_id: message.toolCallId ?? message.toolName ?? "tool-call",
        content: message.content,
      };
    }

    return {
      role: message.role as "user" | "assistant",
      content: message.content,
    };
  });
}

type PendingToolCall = {
  id?: string;
  name?: string;
  argumentsText: string;
};

export function createOpenAIProvider(
  options: CreateOpenAIProviderOptions = {},
): ChatProvider {
  const { logger } = options;

  const apiKey = process.env.LLM_API_KEY;
  const baseURL = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL || "gpt-3.5-turbo";

  // 如果没有配置 API key，使用 mock 实现
  if (!apiKey) {
    return {
      async stream(input) {
        const lastMessage = input.messages[input.messages.length - 1];
        const availableTools = new Set(input.tools?.map((tool) => tool.name));

        if (
          lastMessage?.role === "user" &&
          availableTools.has("current-time") &&
          /(几点|时间|time)/i.test(lastMessage.content)
        ) {
          return {
            type: "tool-call",
            toolName: "current-time",
            input: {},
            toolCallId: "mock-current-time-call",
          };
        }

        if (lastMessage?.role === "tool" && lastMessage.toolName === "current-time") {
          const output = parseToolInput(lastMessage.content);
          const iso =
            output &&
            typeof output === "object" &&
            "iso" in output &&
            typeof output.iso === "string"
              ? output.iso
              : null;
          const content = iso ? `当前时间是 ${iso}` : lastMessage.content;

          input.onDelta?.(content);

          return {
            type: "final",
            content,
          };
        }

        const content = lastMessage?.content ?? "";
        input.onDelta?.(content);

        return {
          type: "final",
          content,
        };
      },
    };
  }

  const client = new OpenAI({
    baseURL: baseURL || "https://api.openai.com/v1",
    apiKey,
  });

  return {
    async stream(input) {
      const start = Date.now();
      const messages = toOpenAIMessages(input.messages);
      const tools = toOpenAITools(input.tools);

      try {
        const response = await client.chat.completions.create({
          model,
          messages,
          ...(tools.length > 0 ? { tools, tool_choice: "auto" as const } : {}),
          stream: true,
        });

        let content = "";
        const toolCalls = new Map<number, PendingToolCall>();

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          const contentChunk = delta?.content;

          if (contentChunk) {
            content += contentChunk;
            input.onDelta?.(contentChunk);
          }

          for (const toolCallChunk of delta?.tool_calls ?? []) {
            const index = toolCallChunk.index;
            const pending = toolCalls.get(index) ?? { argumentsText: "" };

            pending.id = toolCallChunk.id ?? pending.id;
            pending.name = toolCallChunk.function?.name ?? pending.name;
            pending.argumentsText += toolCallChunk.function?.arguments ?? "";

            toolCalls.set(index, pending);
          }
        }

        const toolCall = toolCalls.get(0);

        if (toolCall?.name) {
          return {
            type: "tool-call",
            toolName: toolCall.name,
            input: parseToolInput(toolCall.argumentsText),
            toolCallId: toolCall.id,
          };
        }

        // 记录 LLM 调用日志
        if (logger) {
          logger.info({
            type: 'llm.request',
            model,
            messageCount: input.messages.length,
            duration: Date.now() - start,
          }, 'llm request completed');
        }

        return {
          type: "final",
          content,
        };
      } catch (error) {
        if (logger) {
          logger.error({
            type: 'llm.request',
            model,
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - start,
          }, 'llm request failed');
        }
        throw error;
      }
    },
  };
}
