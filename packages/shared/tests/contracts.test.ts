import { describe, expect, it } from "vitest";
import type { ChatStreamEvent, Conversation, User } from "../src";

describe("shared contracts", () => {
  it("exposes user and conversation contracts", () => {
    const user: User = {
      id: "user_1",
      email: "demo@example.com",
      createdAt: "2026-06-23T00:00:00.000Z",
    };

    const conversation: Conversation = {
      id: "conv_1",
      title: "Hello",
      createdAt: "2026-06-23T00:00:00.000Z",
      updatedAt: "2026-06-23T00:00:00.000Z",
    };

    const event: ChatStreamEvent = { type: "assistant.delta", delta: "Hi" };

    expect(user.email).toBe("demo@example.com");
    expect(conversation.title).toBe("Hello");
    expect(event.type).toBe("assistant.delta");
  });
});
