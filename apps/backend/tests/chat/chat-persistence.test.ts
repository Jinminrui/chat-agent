import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";

type MockUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type MockConversationRecord = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type MockMessageRecord = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
};

const users = new Map<string, MockUserRecord>();
const conversations = new Map<string, MockConversationRecord>();
const messages = new Map<string, MockMessageRecord>();
let nextUserId = 1;
let nextConversationId = 1;
let nextMessageId = 1;

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(
        async ({
          data,
          select,
        }: {
          data: { email: string; passwordHash: string };
          select?: Record<string, boolean>;
        }) => {
          const user = {
            id: `user-${nextUserId++}`,
            email: data.email,
            passwordHash: data.passwordHash,
            createdAt: new Date().toISOString(),
          };
          users.set(user.id, user);
          return {
            ...(select?.id ? { id: user.id } : {}),
            ...(select?.email ? { email: user.email } : {}),
            ...(select?.createdAt ? { createdAt: user.createdAt } : {}),
          };
        },
      ),
      findUnique: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select?: Record<string, boolean>;
        }) => {
          const user = users.get(where.id);
          if (!user) return null;
          return {
            ...(select?.id ? { id: user.id } : {}),
            ...(select?.email ? { email: user.email } : {}),
            ...(select?.createdAt ? { createdAt: user.createdAt } : {}),
          };
        },
      ),
    },
    conversation: {
      create: vi.fn(
        async ({
          data,
          select,
        }: {
          data: { userId: string; title: string };
          select?: Record<string, boolean>;
        }) => {
          const now = new Date().toISOString();
          const conversation = {
            id: `conversation-${nextConversationId++}`,
            userId: data.userId,
            title: data.title,
            createdAt: now,
            updatedAt: now,
          };
          conversations.set(conversation.id, conversation);
          return {
            ...(select?.id ? { id: conversation.id } : {}),
            ...(select?.userId ? { userId: conversation.userId } : {}),
            ...(select?.title ? { title: conversation.title } : {}),
            ...(select?.createdAt ? { createdAt: conversation.createdAt } : {}),
            ...(select?.updatedAt ? { updatedAt: conversation.updatedAt } : {}),
          };
        },
      ),
      findUnique: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select?: Record<string, boolean>;
        }) => {
          const conversation = conversations.get(where.id);
          if (!conversation) return null;
          return {
            ...(select?.id ? { id: conversation.id } : {}),
            ...(select?.userId ? { userId: conversation.userId } : {}),
            ...(select?.title ? { title: conversation.title } : {}),
            ...(select?.createdAt ? { createdAt: conversation.createdAt } : {}),
            ...(select?.updatedAt ? { updatedAt: conversation.updatedAt } : {}),
          };
        },
      ),
    },
    message: {
      create: vi.fn(
        async ({
          data,
          select,
        }: {
          data: { conversationId: string; role: string; content: string };
          select?: Record<string, boolean>;
        }) => {
          const msg = {
            id: `msg-${nextMessageId++}`,
            conversationId: data.conversationId,
            role: data.role,
            content: data.content,
            createdAt: new Date().toISOString(),
          };
          messages.set(msg.id, msg);
          return {
            ...(select?.id ? { id: msg.id } : {}),
            ...(select?.conversationId ? { conversationId: msg.conversationId } : {}),
            ...(select?.role ? { role: msg.role } : {}),
            ...(select?.content ? { content: msg.content } : {}),
            ...(select?.createdAt ? { createdAt: msg.createdAt } : {}),
          };
        },
      ),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
          select,
        }: {
          where?: { conversationId?: string };
          orderBy?: { createdAt?: string };
          select?: Record<string, boolean>;
        }) => {
          return Array.from(messages.values())
            .filter((msg) =>
              where?.conversationId
                ? msg.conversationId === where.conversationId
                : true,
            )
            .sort((a, b) =>
              orderBy?.createdAt === "asc"
                ? a.createdAt.localeCompare(b.createdAt)
                : b.createdAt.localeCompare(a.createdAt),
            )
            .map((msg) => ({
              ...(select?.id ? { id: msg.id } : {}),
              ...(select?.conversationId
                ? { conversationId: msg.conversationId }
                : {}),
              ...(select?.role ? { role: msg.role } : {}),
              ...(select?.content ? { content: msg.content } : {}),
              ...(select?.createdAt ? { createdAt: msg.createdAt } : {}),
            }));
        },
      ),
    },
    toolCall: {
      create: vi.fn(async () => ({})),
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
    users.clear();
    conversations.clear();
    messages.clear();
    nextUserId = 1;
    nextConversationId = 1;
    nextMessageId = 1;
  });

  it("stores the user message, assistant message, and tool call", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "你好，我已经完成处理。" }),
      },
    });

    try {
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "flow@example.com", password: "password123" },
      });

      const session = register.cookies[0]?.value ?? "";

      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session },
        payload: {},
      });

      const conversationId = created.json().conversation.id;

      const streamed = await app.inject({
        method: "POST",
        url: "/chat/stream",
        cookies: { session },
        payload: { conversationId, message: "你好" },
      });

      expect(streamed.statusCode).toBe(200);

      const messagesResponse = await app.inject({
        method: "GET",
        url: `/conversations/${conversationId}/messages`,
        cookies: { session },
      });

      expect(messagesResponse.statusCode).toBe(200);
      expect(messagesResponse.json().items).toHaveLength(2);
      expect(messagesResponse.json().items[0].role).toBe("user");
      expect(messagesResponse.json().items[0].content).toBe("你好");
      expect(messagesResponse.json().items[1].role).toBe("assistant");
      expect(messagesResponse.json().items[1].content).toBe("你好，我已经完成处理。");
    } finally {
      await app.close();
    }
  });

});
