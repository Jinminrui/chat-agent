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

type MockToolCallRecord = {
  id: string;
  conversationId: string;
  messageId: string | null;
  toolName: string;
  toolInput: unknown;
  toolOutput: unknown;
  status: string;
  createdAt: string;
};

type MockCheckpointRecord = {
  id: string;
  conversationId: string;
  messageIndex: number;
  state: unknown;
  createdAt: string;
};

const users = new Map<string, MockUserRecord>();
const conversations = new Map<string, MockConversationRecord>();
const messages = new Map<string, MockMessageRecord>();
const toolCalls = new Map<string, MockToolCallRecord>();
const checkpoints = new Map<string, MockCheckpointRecord>();
let nextUserId = 1;
let nextConversationId = 1;
let nextMessageId = 1;
let nextToolCallId = 1;
let nextCheckpointId = 1;

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
      create: vi.fn(
        async ({
          data,
          select,
        }: {
          data: {
            conversationId: string;
            role: string;
            content: string;
          };
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
            ...(select?.conversationId
              ? { conversationId: msg.conversationId }
              : {}),
            ...(select?.role ? { role: msg.role } : {}),
            ...(select?.content ? { content: msg.content } : {}),
            ...(select?.createdAt ? { createdAt: msg.createdAt } : {}),
          };
        },
      ),
    },
    toolCall: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            conversationId: string;
            messageId?: string;
            toolName: string;
            toolInput: unknown;
            toolOutput: unknown;
            status: string;
          };
        }) => {
          const tc = {
            id: `tc-${nextToolCallId++}`,
            conversationId: data.conversationId,
            messageId: data.messageId ?? null,
            toolName: data.toolName,
            toolInput: data.toolInput,
            toolOutput: data.toolOutput,
            status: data.status,
            createdAt: new Date().toISOString(),
          };

          toolCalls.set(tc.id, tc);
          return tc;
        },
      ),
    },
    checkpoint: {
      create: vi.fn(
        async ({ data }: { data: { conversationId: string; messageIndex: number; state: unknown } }) => {
          const cp = {
            id: `cp-${nextCheckpointId++}`,
            conversationId: data.conversationId,
            messageIndex: data.messageIndex,
            state: data.state,
            createdAt: new Date().toISOString(),
          };
          checkpoints.set(cp.id, cp);
          return cp;
        },
      ),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

function parseSseEvents(body: string) {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
}

describe("chat stream route", () => {
  beforeEach(() => {
    users.clear();
    conversations.clear();
    messages.clear();
    toolCalls.clear();
    checkpoints.clear();
    nextUserId = 1;
    nextConversationId = 1;
    nextMessageId = 1;
    nextToolCallId = 1;
    nextCheckpointId = 1;
  });

  it("streams assistant deltas over SSE", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "你好，世界" }),
      },
    });

    try {
      // Register user and get session
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "chat", email: "chat@example.com", password: "password123" },
      });
      const session = register.cookies[0]?.value ?? "";

      // Create conversation
      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session },
        payload: {},
      });
      const conversationId = created.json().conversation.id;

      // Chat stream
      const response = await app.inject({
        method: "POST",
        url: "/chat/stream",
        cookies: { session },
        payload: {
          conversationId,
          message: "你好",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");
      expect(response.headers["cache-control"]).toContain("no-cache");
      const events = parseSseEvents(response.body);

      expect(events[0]).toEqual({
        type: "assistant.delta",
        delta: "你好，世界",
      });
      expect(events[1]).toMatchObject({
        type: "assistant.done",
      });
      expect(events[1]?.messageId).toEqual(expect.any(String));
      expect(events[1]?.messageId).not.toBe("");
    } finally {
      await app.close();
    }
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "hi" }),
      },
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/chat/stream",
        payload: {
          conversationId: "conv_1",
          message: "你好",
        },
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("returns 404 when conversation does not belong to user", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "hi" }),
      },
    });

    try {
      // Register two users
      const ownerReg = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "owner", email: "owner@example.com", password: "password123" },
      });
      const ownerSession = ownerReg.cookies[0]?.value ?? "";

      const otherReg = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "other", email: "other@example.com", password: "password123" },
      });
      const otherSession = otherReg.cookies[0]?.value ?? "";

      // Owner creates conversation
      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session: ownerSession },
        payload: {},
      });
      const conversationId = created.json().conversation.id;

      // Other user tries to chat in owner's conversation
      const response = await app.inject({
        method: "POST",
        url: "/chat/stream",
        cookies: { session: otherSession },
        payload: {
          conversationId,
          message: "你好",
        },
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("persists user and assistant messages", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "回复内容" }),
      },
    });

    try {
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { username: "persist", email: "persist@example.com", password: "password123" },
      });
      const session = register.cookies[0]?.value ?? "";

      const created = await app.inject({
        method: "POST",
        url: "/conversations",
        cookies: { session },
        payload: {},
      });
      const conversationId = created.json().conversation.id;

      await app.inject({
        method: "POST",
        url: "/chat/stream",
        cookies: { session },
        payload: {
          conversationId,
          message: "测试消息",
        },
      });

      // Verify user message was persisted
      const userMsgs = Array.from(messages.values()).filter(
        (m) => m.conversationId === conversationId && m.role === "user",
      );
      expect(userMsgs).toHaveLength(1);
      expect(userMsgs[0]?.content).toBe("测试消息");

      // Verify assistant message was persisted
      const assistantMsgs = Array.from(messages.values()).filter(
        (m) => m.conversationId === conversationId && m.role === "assistant",
      );
      expect(assistantMsgs).toHaveLength(1);
      expect(assistantMsgs[0]?.content).toBe("回复内容");
    } finally {
      await app.close();
    }
  });
});
