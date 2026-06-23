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

          if (!user) {
            return null;
          }

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
      findMany: vi.fn(
        async ({
          where,
          select,
        }: {
          where?: { userId?: string };
          select?: Record<string, boolean>;
        }) => {
          return Array.from(conversations.values())
            .filter((conversation) =>
              where?.userId ? conversation.userId === where.userId : true,
            )
            .sort((left, right) =>
              right.updatedAt.localeCompare(left.updatedAt),
            )
            .map((conversation) => ({
              ...(select?.id ? { id: conversation.id } : {}),
              ...(select?.userId ? { userId: conversation.userId } : {}),
              ...(select?.title ? { title: conversation.title } : {}),
              ...(select?.createdAt
                ? { createdAt: conversation.createdAt }
                : {}),
              ...(select?.updatedAt
                ? { updatedAt: conversation.updatedAt }
                : {}),
            }));
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

          if (!conversation) {
            return null;
          }

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
      findMany: vi.fn(
        async ({
          where,
          select,
        }: {
          where?: { conversationId?: string };
          select?: Record<string, boolean>;
        }) => {
          return Array.from(messages.values())
            .filter((message) =>
              where?.conversationId
                ? message.conversationId === where.conversationId
                : true,
            )
            .sort((left, right) =>
              left.createdAt.localeCompare(right.createdAt),
            )
            .map((message) => ({
              ...(select?.id ? { id: message.id } : {}),
              ...(select?.conversationId
                ? { conversationId: message.conversationId }
                : {}),
              ...(select?.role ? { role: message.role } : {}),
              ...(select?.content ? { content: message.content } : {}),
              ...(select?.createdAt ? { createdAt: message.createdAt } : {}),
            }));
        },
      ),
    },
  },
}));

describe("conversation routes", () => {
  beforeEach(() => {
    users.clear();
    conversations.clear();
    messages.clear();
    nextUserId = 1;
    nextConversationId = 1;
  });

  it("creates a conversation and lists messages for the owner", async () => {
    const app = buildApp();

    try {
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "owner@example.com", password: "password123" },
      });

      const session = register.cookies[0]?.value ?? "";

      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session },
        payload: {},
      });

      expect(created.statusCode).toBe(201);

      const list = await app.inject({
        method: "GET",
        url: "/conversations",
        cookies: { session },
      });

      expect(list.statusCode).toBe(200);
      expect(list.json().items).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it("lists messages for the conversation owner", async () => {
    const app = buildApp();

    try {
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "reader@example.com", password: "password123" },
      });

      const session = register.cookies[0]?.value ?? "";
      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session },
        payload: {},
      });

      const conversationId = created.json().conversation.id;
      const list = await app.inject({
        method: "GET",
        url: `/conversations/${conversationId}/messages`,
        cookies: { session },
      });

      expect(list.statusCode).toBe(200);
      expect(list.json().items).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it("returns 401 when creating a conversation without login", async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/conversations",
        payload: {},
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("returns 401 when listing messages without login", async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/conversations/conversation-1/messages",
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("returns 404 when another user reads someone else's messages", async () => {
    const app = buildApp();

    try {
      const ownerRegister = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "owner-a@example.com", password: "password123" },
      });
      const ownerSession = ownerRegister.cookies[0]?.value ?? "";

      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session: ownerSession },
        payload: {},
      });

      const intruderRegister = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "owner-b@example.com", password: "password123" },
      });
      const intruderSession = intruderRegister.cookies[0]?.value ?? "";

      const response = await app.inject({
        method: "GET",
        url: `/conversations/${created.json().conversation.id}/messages`,
        cookies: { session: intruderSession },
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
