/**
 * OpenAI provider stub.
 *
 * This is a placeholder implementation that echoes back the last user message.
 * Replace with a real OpenAI API integration when ready.
 */

import type { FastifyBaseLogger } from "fastify";
import type { ChatProvider } from "./provider.types";

type CreateOpenAIProviderOptions = {
  logger?: FastifyBaseLogger;
};

export function createOpenAIProvider(
  options: CreateOpenAIProviderOptions = {},
): ChatProvider {
  const { logger } = options;

  return {
    async stream(input) {
      const start = Date.now();
      const lastMessage = input.messages[input.messages.length - 1];

      // 模拟 LLM 调用
      const result = {
        type: "final" as const,
        content: lastMessage?.content ?? "",
      };

      // 记录 LLM 调用日志
      if (logger) {
        logger.info({
          type: 'llm.request',
          messageCount: input.messages.length,
          duration: Date.now() - start,
        }, 'llm request completed');
      }

      return result;
    },
  };
}
