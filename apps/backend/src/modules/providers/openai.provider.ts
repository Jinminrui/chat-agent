/**
 * OpenAI-compatible provider.
 *
 * Uses the OpenAI API format to call LLM models.
 * Supports custom base URLs for compatible providers.
 * Falls back to mock implementation when no API key is configured.
 */

import OpenAI from "openai";
import type { FastifyBaseLogger } from "fastify";
import type { ChatProvider } from "./provider.types";

type CreateOpenAIProviderOptions = {
  logger?: FastifyBaseLogger;
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
        return {
          type: "final",
          content: lastMessage?.content ?? "",
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

      // 转换消息格式
      const messages = input.messages.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      try {
        const response = await client.chat.completions.create({
          model,
          messages,
          stream: false,
        });

        const content = response.choices[0]?.message?.content || "";

        // 记录 LLM 调用日志
        if (logger) {
          logger.info({
            type: 'llm.request',
            model,
            messageCount: input.messages.length,
            duration: Date.now() - start,
            tokens: response.usage,
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
