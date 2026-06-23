/**
 * Chat persistence tests
 *
 * These tests verify that the /chat/stream route correctly persists
 * user messages, assistant messages, and tool calls to the database.
 *
 * NOTE: The production code (chat.routes.ts) was already implemented
 * in commit 754da9a before these tests were written. TDD was not
 * applicable because the implementation pre-existed. These tests
 * serve as regression coverage for the existing behavior.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";

// Lightweight Prisma mock — tracks calls and returns minimal objects.
// No in-memory Maps or select-field filtering; just enough to exercise
// the persistence paths and assert on the calls that matter.

let nextId = 1;
const createdMessages: Array<{
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
}> = [];
const toolCallCreates: Array<Record<string, unknown>> = [];

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(async () => ({
        id: `user-${nextId++}`,
        email: "test@example.com",
        createdAt: new Date().toISOString(),
      })),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        // Return a mock user for any lookup (session or email)
        return {
          id: where.id ?? `user-1`,
          email: where.email ?? "test@example.com",
          passwordHash: "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12",
          createdAt: new Date().toISOString(),
        };
      }),
    },
    conversation: {
      create: vi.fn(async () => ({
        id: `conv-${nextId++}`,
        userId: "user-1",
        title: "New conversation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        userId: "user-1",
        title: "Test",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    },
    message: {
      create: vi.fn(
        async ({ data }: { data: { conversationId: string; role: string; content: string } }) => {
          const msg = {
            id: `msg-${nextId++}`,
            conversationId: data.conversationId,
            role: data.role,
            content: data.content,
            createdAt: new Date().toISOString(),
          };
          createdMessages.push(msg);
          return msg;
        },
      ),
      findMany: vi.fn(
        async ({ where }: { where: { conversationId: string } }) =>
          createdMessages.filter((m) => m.conversationId === where.conversationId),
      ),
    },
    toolCall: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        toolCallCreates.push(data);
        return { id: `tc-${nextId++}`, ...data };
      }),
    },
    checkpoint: {
      create: vi.fn(async () => ({})),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

describe("chat persistence", () => {
  beforeEach(() => {
    nextId = 1;
    createdMessages.length = 0;
    toolCallCreates.length = 0;
    vi.clearAllMocks();
  });

  it("stores the user message and assistant message", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "你好，我已经完成处理。" }),
      },
    });

    try {
      const register = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { username: "flow", email: "flow@example.com", password: "password123" },
      });

      const session = register.cookies[0]?.value ?? "";

      const created = await app.inject({
        method: "POST",
        url: "/api/conversations",
        cookies: { session },
        payload: {},
      });

      const conversationId = created.json().data.conversation.id;

      const streamed = await app.inject({
        method: "POST",
        url: "/api/chat/stream",
        cookies: { session },
        payload: { conversationId, message: "你好" },
      });

      expect(streamed.statusCode).toBe(200);

      const messagesResponse = await app.inject({
        method: "GET",
        url: `/api/conversations/${conversationId}/messages`,
        cookies: { session },
      });

      expect(messagesResponse.statusCode).toBe(200);
      expect(messagesResponse.json().code).toBe(0);
      expect(messagesResponse.json().data.items).toHaveLength(2);
      expect(messagesResponse.json().data.items[0].role).toBe("user");
      expect(messagesResponse.json().data.items[0].content).toBe("你好");
      expect(messagesResponse.json().data.items[1].role).toBe("assistant");
      expect(messagesResponse.json().data.items[1].content).toBe("你好，我已经完成处理。");
    } finally {
      await app.close();
    }
  });

  it("persists tool calls when the provider returns a tool-call response", async () => {
    const app = buildApp({
      provider: {
        stream: async ({ messages }: { messages: Array<{ role: string }> }) => {
          // If the messages contain a tool-role message, the tool was already
          // executed — return the final answer.
          if (messages.some((m) => m.role === "tool")) {
            return { type: "final", content: "工具调用完成" };
          }
          return { type: "tool-call", toolName: "current-time", input: {} };
        },
      },
      tools: {
        "current-time": async () => ({ time: "2025-01-01T00:00:00Z" }),
      },
    });

    try {
      const register = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { username: "tool", email: "tool@example.com", password: "password123" },
      });

      const session = register.cookies[0]?.value ?? "";

      const created = await app.inject({
        method: "POST",
        url: "/api/conversations",
        cookies: { session },
        payload: {},
      });

      const conversationId = created.json().data.conversation.id;

      const streamed = await app.inject({
        method: "POST",
        url: "/api/chat/stream",
        cookies: { session },
        payload: { conversationId, message: "现在几点？" },
      });

      expect(streamed.statusCode).toBe(200);

      // Assert tool call was persisted with correct arguments
      expect(toolCallCreates).toHaveLength(1);
      expect(toolCallCreates[0]).toMatchObject({
        toolName: "current-time",
        toolInput: {},
        status: "completed",
      });
      // conversationId and messageId should be present
      expect(toolCallCreates[0].conversationId).toBeDefined();
      expect(toolCallCreates[0].messageId).toBeDefined();

      // The final assistant message should also be persisted
      expect(createdMessages).toHaveLength(2); // user + assistant
      expect(createdMessages[0].role).toBe("user");
      expect(createdMessages[1].role).toBe("assistant");
      expect(createdMessages[1].content).toBe("工具调用完成");
    } finally {
      await app.close();
    }
  });
});
