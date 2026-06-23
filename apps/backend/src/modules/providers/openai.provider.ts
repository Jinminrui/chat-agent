/**
 * OpenAI provider stub.
 *
 * This is a placeholder implementation that echoes back the last user message.
 * Replace with a real OpenAI API integration when ready.
 */

import type { ChatProvider } from "./provider.types";

export function createOpenAIProvider(): ChatProvider {
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
