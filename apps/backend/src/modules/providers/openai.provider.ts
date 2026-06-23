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
