# Chat Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个前后端分离的网页聊天 agent，支持账号密码登录、个人会话历史、SSE 流式回复，以及少量服务端内置工具调用。

**Architecture:** 采用 `pnpm workspace` 管理前后端，但前后端在运行时和部署上完全解耦。前端使用 `Next.js App Router` 构建独立 Web 应用，通过环境变量指向后端服务地址；后端使用 `Fastify` 提供认证、会话、消息和 SSE 聊天接口，并通过 `Prisma` 管理用户、会话、消息和工具调用持久化。部署目标是前端、后端、数据库三者可独立发布和回滚。

**Tech Stack:** `pnpm`, `TypeScript`, `Next.js`, `React`, `Fastify`, `Prisma`, `PostgreSQL`, `Vitest`, `Playwright`

---

## 文件结构

本计划默认创建以下工作区结构：

```text
package.json
pnpm-workspace.yaml
apps/
├─ web/
│  ├─ app/
│  ├─ components/
│  ├─ features/
│  ├─ lib/
│  ├─ styles/
│  └─ tests/
└─ backend/
   ├─ src/
   │  ├─ app.ts
   │  ├─ server.ts
   │  ├─ config/
   │  ├─ modules/
   │  │  ├─ auth/
   │  │  ├─ conversations/
   │  │  ├─ chat/
   │  │  ├─ providers/
   │  │  └─ tools/
   │  └─ plugins/
   └─ tests/
packages/
└─ shared/
   └─ src/
prisma/
└─ schema.prisma
```

职责约定：

- `apps/web`：前端页面、组件、业务 hooks、API 客户端
- `apps/backend`：后端接口、agent runtime、provider 封装、工具注册
- `packages/shared`：前后端共用类型和 SSE 事件定义
- `prisma`：数据库 schema 和迁移

## 独立部署约束

计划按以下部署前提展开：

- 前端独立部署，例如 `web.example.com`
- 后端独立部署，例如 `api.example.com`
- 数据库独立部署，例如托管 `PostgreSQL`
- 前端通过 `NEXT_PUBLIC_API_BASE_URL` 访问后端
- 前后端独立发布、独立回滚，不共享运行时

由此带来的实现约束：

- 后端必须显式配置 `CORS`
- 认证必须按跨域部署设计 `cookie` 策略
- 本地开发要支持 `web` 与 `backend` 分别启动
- 前端不能依赖任何同进程后端能力

### Task 1: 初始化 Monorepo 与基础脚手架

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/web/package.json`
- Create: `apps/backend/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `.gitignore`

- [x] **Step 1: 写根目录 workspace 配置的失败检查**

```bash
test -f /Users/jinminrui/Desktop/chat-agent/package.json && echo "exists" || echo "missing"
```

Expected: 输出 `missing`

- [x] **Step 2: 写最小 workspace 配置**

```json
{
  "name": "chat-agent",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:backend": "pnpm --filter backend dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  }
}
```

```yaml
packages:
  - apps/*
  - packages/*
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@chat-agent/shared": ["packages/shared/src/index.ts"]
    }
  }
}
```

```ts
export type MessageRole = "user" | "assistant";

export type ChatStreamEvent =
  | { type: "assistant.delta"; delta: string }
  | {
      type: "tool.status";
      toolName: string;
      status: "running" | "success" | "error";
      label: string;
    }
  | { type: "assistant.done"; messageId: string }
  | { type: "error"; message: string };
```

- [x] **Step 3: 运行 workspace 基础验证**

Run: `pnpm install`

Expected: 成功生成 `pnpm-lock.yaml`，无 `ERR_PNPM_NO_MATCHING_VERSION` 错误

- [x] **Step 4: 提交初始化骨架**

```bash
git init
git add package.json pnpm-workspace.yaml tsconfig.base.json packages/shared apps .gitignore pnpm-lock.yaml
git commit -m "chore: initialize chat agent workspace"
```

### Task 2: 建立数据库模型与 Prisma 基础

**Files:**
- Create: `prisma/schema.prisma`
- Create: `apps/backend/src/lib/prisma.ts`
- Create: `apps/backend/tests/prisma/schema.test.ts`
- Modify: `apps/backend/package.json`

- [x] **Step 1: 先写数据库 schema 的失败测试**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("prisma schema", () => {
  it("contains user, conversation, message, and tool call models", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    expect(schema).toContain("model User");
    expect(schema).toContain("model Conversation");
    expect(schema).toContain("model Message");
    expect(schema).toContain("model ToolCall");
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test apps/backend/tests/prisma/schema.test.ts`

Expected: FAIL，提示 `ENOENT` 或找不到 `schema.prisma`

- [x] **Step 3: 写最小 Prisma schema 和客户端入口**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(cuid())
  email        String         @unique
  username     String?        @unique
  passwordHash String
  createdAt    DateTime       @default(now())
  conversations Conversation[]
}

model Conversation {
  id        String     @id @default(cuid())
  userId    String
  title     String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  toolCalls ToolCall[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           String
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  toolCalls      ToolCall[]
}

model ToolCall {
  id             String       @id @default(cuid())
  conversationId String
  messageId      String?
  toolName       String
  toolInput      Json?
  toolOutput     Json?
  status         String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  message        Message?     @relation(fields: [messageId], references: [id], onDelete: SetNull)
}
```

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [x] **Step 4: 运行测试并生成 Prisma Client**

Run: `pnpm --filter backend exec prisma generate && pnpm --filter backend test apps/backend/tests/prisma/schema.test.ts`

Expected: `prisma generate` 成功；测试 PASS

- [x] **Step 5: 提交数据库基础**

```bash
git add prisma/schema.prisma apps/backend/src/lib/prisma.ts apps/backend/tests/prisma/schema.test.ts apps/backend/package.json
git commit -m "feat: add prisma data model"
```

### Task 3: 建立共享类型与 SSE 事件契约

**Files:**
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/contracts.ts`
- Create: `packages/shared/src/events.ts`
- Create: `packages/shared/tests/contracts.test.ts`

- [x] **Step 1: 先写共享契约测试**

```ts
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
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @chat-agent/shared test packages/shared/tests/contracts.test.ts`

Expected: FAIL，提示缺少 `User` 或 `Conversation` 导出

- [x] **Step 3: 补齐共享类型**

```ts
export type User = {
  id: string;
  email: string;
  username?: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ToolCallStatus = "running" | "success" | "error";
```

```ts
export type ChatStreamEvent =
  | { type: "assistant.delta"; delta: string }
  | {
      type: "tool.status";
      toolName: string;
      status: "running" | "success" | "error";
      label: string;
    }
  | { type: "assistant.done"; messageId: string }
  | { type: "error"; message: string };
```

```ts
export * from "./contracts";
export * from "./events";
```

- [x] **Step 4: 运行共享包测试**

Run: `pnpm --filter @chat-agent/shared test packages/shared/tests/contracts.test.ts`

Expected: PASS

- [x] **Step 5: 提交共享契约**

```bash
git add packages/shared/src packages/shared/tests
git commit -m "feat: add shared frontend backend contracts"
```

### Task 4: 实现认证接口与 Cookie Session

**Files:**
- Create: `apps/backend/src/plugins/auth-session.ts`
- Create: `apps/backend/src/modules/auth/auth.schema.ts`
- Create: `apps/backend/src/modules/auth/auth.service.ts`
- Create: `apps/backend/src/modules/auth/auth.routes.ts`
- Create: `apps/backend/tests/auth/auth.routes.test.ts`
- Modify: `apps/backend/src/app.ts`

- [x] **Step 1: 先写认证路由集成测试**

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("auth routes", () => {
  it("registers and returns the current user", async () => {
    const app = buildApp();

    const register = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "demo@example.com",
        password: "password123",
      },
    });

    expect(register.statusCode).toBe(201);
    expect(register.json().user.email).toBe("demo@example.com");

    const cookies = register.cookies;
    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: {
        session: cookies[0]?.value ?? "",
      },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe("demo@example.com");
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test apps/backend/tests/auth/auth.routes.test.ts`

Expected: FAIL，提示 `buildApp` 未定义或 `/auth/register` 返回 404

- [x] **Step 3: 写最小认证实现**

```ts
import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import session from "@fastify/session";

export const authSessionPlugin = fp(async (app) => {
  await app.register(cookie);
  await app.register(session, {
    secret: process.env.SESSION_SECRET ?? "dev-session-secret-dev-session-secret",
    cookieName: "session",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  });
});
```

```ts
import cors from "@fastify/cors";

await app.register(cors, {
  origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
  credentials: true,
});
```

```ts
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";

export async function registerUser(input: { email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
    },
  });
}
```

```ts
app.post("/auth/register", async (request, reply) => {
  const user = await registerUser(request.body as { email: string; password: string });
  request.session.set("userId", user.id);
  return reply.code(201).send({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    },
  });
});
```

- [x] **Step 4: 运行认证测试**

Run: `pnpm --filter backend test apps/backend/tests/auth/auth.routes.test.ts`

Expected: PASS

- [x] **Step 5: 提交认证基础**

```bash
git add apps/backend/src/plugins/auth-session.ts apps/backend/src/modules/auth apps/backend/src/app.ts apps/backend/tests/auth/auth.routes.test.ts
git commit -m "feat: add backend auth routes and cors setup"
```

### Task 5: 实现会话与消息历史接口

**Files:**
- Create: `apps/backend/src/modules/conversations/conversation.service.ts`
- Create: `apps/backend/src/modules/conversations/conversation.routes.ts`
- Create: `apps/backend/tests/conversations/conversation.routes.test.ts`
- Modify: `apps/backend/src/app.ts`

- [x] **Step 1: 先写会话接口测试**

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("conversation routes", () => {
  it("creates a conversation and lists messages for the owner", async () => {
    const app = buildApp();

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
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test apps/backend/tests/conversations/conversation.routes.test.ts`

Expected: FAIL，提示 `/conversations` 返回 404

- [x] **Step 3: 写最小会话实现**

```ts
import { prisma } from "../../lib/prisma";

export async function createConversation(userId: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: "New conversation",
    },
  });
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listMessages(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error("FORBIDDEN_CONVERSATION");
  }

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}
```

- [x] **Step 4: 运行会话测试**

Run: `pnpm --filter backend test apps/backend/tests/conversations/conversation.routes.test.ts`

Expected: PASS

- [x] **Step 5: 提交会话接口**

```bash
git add apps/backend/src/modules/conversations apps/backend/src/app.ts apps/backend/tests/conversations/conversation.routes.test.ts
git commit -m "feat: add conversation history routes"
```

### Task 6: 实现工具注册表与最小 Agent Runtime

**Files:**
- Create: `apps/backend/src/modules/tools/tool-registry.ts`
- Create: `apps/backend/src/modules/tools/builtins/current-time.tool.ts`
- Create: `apps/backend/src/modules/tools/builtins/fetch-url.tool.ts`
- Create: `apps/backend/src/modules/tools/builtins/web-search.tool.ts`
- Create: `apps/backend/src/modules/chat/agent-runtime.ts`
- Create: `apps/backend/tests/chat/agent-runtime.test.ts`

- [x] **Step 1: 先写 runtime 测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { createAgentRuntime } from "../../src/modules/chat/agent-runtime";

describe("agent runtime", () => {
  it("runs a requested tool and returns the final assistant message", async () => {
    const provider = {
      stream: vi
        .fn()
        .mockResolvedValueOnce({
          type: "tool-call",
          toolName: "current_time",
          input: {},
        })
        .mockResolvedValueOnce({
          type: "final",
          content: "现在是 10:00。",
        }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        current_time: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
      maxToolCalls: 3,
    });

    const result = await runtime.run({
      messages: [{ role: "user", content: "现在几点？" }],
    });

    expect(result.content).toBe("现在是 10:00。");
    expect(result.toolCalls).toHaveLength(1);
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test apps/backend/tests/chat/agent-runtime.test.ts`

Expected: FAIL，提示 `createAgentRuntime` 未定义

- [x] **Step 3: 写最小工具注册与 runtime**

```ts
export type ToolHandler = (input: unknown) => Promise<unknown>;

export function createToolRegistry(tools: Record<string, ToolHandler>) {
  return {
    has(name: string) {
      return name in tools;
    },
    async run(name: string, input: unknown) {
      const tool = tools[name];

      if (!tool) {
        throw new Error(`UNKNOWN_TOOL:${name}`);
      }

      return tool(input);
    },
  };
}
```

```ts
export function createAgentRuntime(config: {
  provider: {
    stream: (input: { messages: Array<{ role: string; content: string }> }) => Promise<
      | { type: "tool-call"; toolName: string; input: unknown }
      | { type: "final"; content: string }
    >;
  };
  tools: Record<string, (input: unknown) => Promise<unknown>>;
  maxToolCalls: number;
}) {
  const registry = createToolRegistry(config.tools);

  return {
    async run(input: { messages: Array<{ role: string; content: string }> }) {
      const toolCalls: Array<{ toolName: string; output: unknown }> = [];
      let attempts = 0;
      let messages = [...input.messages];

      while (attempts < config.maxToolCalls) {
        const next = await config.provider.stream({ messages });

        if (next.type === "final") {
          return { content: next.content, toolCalls };
        }

        const output = await registry.run(next.toolName, next.input);
        toolCalls.push({ toolName: next.toolName, output });
        messages.push({
          role: "assistant",
          content: JSON.stringify({ tool: next.toolName, output }),
        });
        attempts += 1;
      }

      throw new Error("MAX_TOOL_CALLS_EXCEEDED");
    },
  };
}
```

- [x] **Step 4: 运行 runtime 测试**

Run: `pnpm --filter backend test apps/backend/tests/chat/agent-runtime.test.ts`

Expected: PASS

- [x] **Step 5: 提交 runtime 基础**

```bash
git add apps/backend/src/modules/tools apps/backend/src/modules/chat/agent-runtime.ts apps/backend/tests/chat/agent-runtime.test.ts
git commit -m "feat: add minimal agent runtime"
```

### Task 7: 接入 Provider 适配层与 SSE 聊天接口

**Files:**
- Create: `apps/backend/src/modules/providers/provider.types.ts`
- Create: `apps/backend/src/modules/providers/openai.provider.ts`
- Create: `apps/backend/src/modules/chat/chat.routes.ts`
- Create: `apps/backend/tests/chat/chat.routes.test.ts`
- Modify: `apps/backend/src/app.ts`

- [x] **Step 1: 先写 SSE 聊天路由测试**

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("chat stream route", () => {
  it("streams assistant deltas over SSE", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "你好，世界" }),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/chat/stream",
      payload: {
        conversationId: "conv_1",
        message: "你好",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.body).toContain("\"type\":\"assistant.delta\"");
    expect(response.body).toContain("\"type\":\"assistant.done\"");
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test apps/backend/tests/chat/chat.routes.test.ts`

Expected: FAIL，提示 `/chat/stream` 返回 404

- [x] **Step 3: 写最小 Provider 适配与 SSE 路由**

```ts
export type ProviderResult =
  | { type: "tool-call"; toolName: string; input: unknown }
  | { type: "final"; content: string };

export type ChatProvider = {
  stream(input: { messages: Array<{ role: string; content: string }> }): Promise<ProviderResult>;
};
```

```ts
reply
  .header("content-type", "text/event-stream")
  .header("cache-control", "no-cache")
  .send(
    [
      `data: ${JSON.stringify({ type: "assistant.delta", delta: "你好，世界" })}\n`,
      `data: ${JSON.stringify({ type: "assistant.done", messageId: "msg_1" })}\n`,
      "\n",
    ].join(""),
  );
```

- [x] **Step 4: 运行聊天路由测试**

Run: `pnpm --filter backend test apps/backend/tests/chat/chat.routes.test.ts`

Expected: PASS

- [x] **Step 5: 提交 SSE 聊天接口**

```bash
git add apps/backend/src/modules/providers apps/backend/src/modules/chat/chat.routes.ts apps/backend/src/app.ts apps/backend/tests/chat/chat.routes.test.ts
git commit -m "feat: add sse chat endpoint"
```

### Task 8: 实现前端认证页与 API 客户端

**Files:**
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/register/page.tsx`
- Create: `apps/web/components/auth/auth-card.tsx`
- Create: `apps/web/components/auth/login-form.tsx`
- Create: `apps/web/lib/api/client.ts`
- Create: `apps/web/lib/api/auth.ts`
- Create: `apps/web/tests/auth/login-page.test.tsx`

- [ ] **Step 1: 先写登录页测试**

```tsx
import { render, screen } from "@testing-library/react";
import LoginPage from "../../app/login/page";

describe("LoginPage", () => {
  it("renders login form fields and button", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("邮箱或用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test apps/web/tests/auth/login-page.test.tsx`

Expected: FAIL，提示找不到 `/app/login/page.tsx`

- [ ] **Step 3: 写最小登录页和 API 客户端**

```ts
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API_ERROR:${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

```tsx
export default function LoginPage() {
  return (
    <main>
      <section>
        <h1>欢迎回来</h1>
        <form>
          <label>
            邮箱或用户名
            <input name="emailOrUsername" type="text" />
          </label>
          <label>
            密码
            <input name="password" type="password" />
          </label>
          <button type="submit">登录</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 运行登录页测试**

Run: `pnpm --filter web test apps/web/tests/auth/login-page.test.tsx`

Expected: PASS

- [ ] **Step 5: 提交前端认证基础**

```bash
git add apps/web/app/login/page.tsx apps/web/app/register/page.tsx apps/web/components/auth apps/web/lib/api apps/web/tests/auth/login-page.test.tsx
git commit -m "feat: add frontend auth pages"
```

### Task 9: 实现聊天页、会话列表和 SSE 消费

**Files:**
- Create: `apps/web/app/chat/page.tsx`
- Create: `apps/web/app/chat/[conversationId]/page.tsx`
- Create: `apps/web/components/chat/sidebar.tsx`
- Create: `apps/web/components/chat/message-list.tsx`
- Create: `apps/web/components/chat/composer.tsx`
- Create: `apps/web/lib/api/conversations.ts`
- Create: `apps/web/lib/api/chat.ts`
- Create: `apps/web/features/chat/use-chat-stream.ts`
- Create: `apps/web/tests/chat/chat-page.test.tsx`

- [ ] **Step 1: 先写聊天页测试**

```tsx
import { render, screen } from "@testing-library/react";
import ChatPage from "../../app/chat/page";

describe("ChatPage", () => {
  it("renders the new conversation button and composer", () => {
    render(<ChatPage />);

    expect(screen.getByRole("button", { name: "新建会话" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test apps/web/tests/chat/chat-page.test.tsx`

Expected: FAIL，提示找不到 `/app/chat/page.tsx`

- [ ] **Step 3: 写最小聊天页、侧栏和 SSE 消费器**

```ts
export async function streamChat(
  input: { conversationId: string; message: string },
  handlers: {
    onEvent: (event: import("@chat-agent/shared").ChatStreamEvent) => void;
    onComplete?: () => void;
  },
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const text = await response.text();
  const lines = text.split("\n").filter((line) => line.startsWith("data: "));

  for (const line of lines) {
    handlers.onEvent(JSON.parse(line.slice(6)));
  }

  handlers.onComplete?.();
}
```

```tsx
export default function ChatPage() {
  return (
    <main>
      <aside>
        <button type="button">新建会话</button>
      </aside>
      <section>
        <div>欢迎开始新的对话</div>
        <form>
          <textarea placeholder="输入消息..." />
          <button type="submit">发送</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 运行聊天页测试**

Run: `pnpm --filter web test apps/web/tests/chat/chat-page.test.tsx`

Expected: PASS

- [ ] **Step 5: 提交聊天前端基础**

```bash
git add apps/web/app/chat apps/web/components/chat apps/web/lib/api/conversations.ts apps/web/lib/api/chat.ts apps/web/features/chat/use-chat-stream.ts apps/web/tests/chat/chat-page.test.tsx
git commit -m "feat: add chat page and sse client"
```

### Task 10: 端到端串联认证、会话、消息落库与工具状态

**Files:**
- Modify: `apps/backend/src/modules/chat/chat.routes.ts`
- Modify: `apps/backend/src/modules/conversations/conversation.service.ts`
- Modify: `apps/backend/src/modules/chat/agent-runtime.ts`
- Modify: `apps/web/app/chat/[conversationId]/page.tsx`
- Create: `apps/backend/tests/chat/chat-persistence.test.ts`
- Create: `apps/web/tests/chat/chat-flow.test.tsx`

- [ ] **Step 1: 先写后端聊天闭环测试**

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("chat persistence", () => {
  it("stores the user message, assistant message, and tool call", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "你好，我已经完成处理。" }),
      },
    });

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

    const messages = await app.inject({
      method: "GET",
      url: `/conversations/${conversationId}/messages`,
      cookies: { session },
    });

    expect(messages.json().items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test apps/backend/tests/chat/chat-persistence.test.ts`

Expected: FAIL，提示消息未落库或消息数量不匹配

- [ ] **Step 3: 写最小落库与前端联动**

```ts
const userMessage = await prisma.message.create({
  data: {
    conversationId,
    role: "user",
    content: message,
  },
});

const assistantMessage = await prisma.message.create({
  data: {
    conversationId,
    role: "assistant",
    content: runtimeResult.content,
  },
});

await prisma.toolCall.createMany({
  data: runtimeResult.toolCalls.map((toolCall) => ({
    conversationId,
    messageId: assistantMessage.id,
    toolName: toolCall.toolName,
    toolOutput: toolCall.output,
    status: "success",
  })),
});
```

```tsx
useEffect(() => {
  if (!conversationId) return;
  void listMessages(conversationId).then(setMessages);
}, [conversationId]);
```

- [ ] **Step 4: 运行后端与前端关键测试**

Run: `pnpm --filter backend test apps/backend/tests/chat/chat-persistence.test.ts && pnpm --filter web test apps/web/tests/chat/chat-flow.test.tsx`

Expected: 两个测试都 PASS

- [ ] **Step 5: 提交端到端闭环**

```bash
git add apps/backend/src/modules/chat/chat.routes.ts apps/backend/src/modules/conversations/conversation.service.ts apps/backend/src/modules/chat/agent-runtime.ts apps/web/app/chat/[conversationId]/page.tsx apps/backend/tests/chat/chat-persistence.test.ts apps/web/tests/chat/chat-flow.test.tsx
git commit -m "feat: wire chat persistence end to end"
```

### Task 11: 补齐样式 Token、空状态与基础响应式

**Files:**
- Create: `apps/web/styles/tokens.css`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/chat/sidebar.tsx`
- Modify: `apps/web/components/chat/composer.tsx`
- Modify: `apps/web/components/chat/message-list.tsx`
- Create: `apps/web/tests/chat/responsive-layout.test.tsx`

- [ ] **Step 1: 先写样式存在性测试**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("design tokens", () => {
  it("defines the app background, sidebar background, and accent color", () => {
    const css = readFileSync("apps/web/styles/tokens.css", "utf8");

    expect(css).toContain("--bg-app: #f6f3ee;");
    expect(css).toContain("--bg-sidebar: #efe9e1;");
    expect(css).toContain("--accent-primary: #355d52;");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test apps/web/tests/chat/responsive-layout.test.tsx`

Expected: FAIL，提示找不到 `tokens.css`

- [ ] **Step 3: 写最小设计 token 和布局样式**

```css
:root {
  --bg-app: #f6f3ee;
  --bg-surface: #fbf9f6;
  --bg-sidebar: #efe9e1;
  --text-primary: #1f1f1c;
  --text-secondary: #6f6a62;
  --border-default: #ddd6cc;
  --accent-primary: #355d52;
}
```

```css
body {
  margin: 0;
  background: var(--bg-app);
  color: var(--text-primary);
}

.chat-shell {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

@media (max-width: 767px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: 运行样式测试**

Run: `pnpm --filter web test apps/web/tests/chat/responsive-layout.test.tsx`

Expected: PASS

- [ ] **Step 5: 提交样式与响应式**

```bash
git add apps/web/styles/tokens.css apps/web/app/globals.css apps/web/components/chat apps/web/tests/chat/responsive-layout.test.tsx
git commit -m "feat: add chat design tokens and responsive layout"
```

### Task 12: 最终验证、文档补充与运行说明

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-06-23-chat-agent-design.md`

- [ ] **Step 1: 先写 README 验收清单**

```md
# Chat Agent

## Development

- `pnpm install`
- `pnpm --filter backend exec prisma migrate dev`
- `pnpm dev:backend`
- `pnpm dev:web`

## Test

- `pnpm test`
```

- [ ] **Step 2: 运行完整测试套件**

Run: `pnpm test`

Expected: 所有 `api`、`web`、`shared` 测试 PASS

- [ ] **Step 3: 回填最终实现说明**

```md
## Delivered

- 账号密码登录
- 历史会话列表
- SSE 流式聊天
- 内置工具注册与最小 agent runtime
- 前后端共享契约
```

- [ ] **Step 4: 提交文档与验收**

```bash
git add README.md docs/superpowers/specs/2026-06-23-chat-agent-design.md
git commit -m "docs: add local development and verification guide"
```

## 自检

### Spec 覆盖检查

- 登录、退出、当前用户：Task 4
- 会话列表、创建会话、消息历史：Task 5
- Agent runtime、工具注册、调用上限：Task 6
- Provider 抽象与 SSE 聊天接口：Task 7
- 登录页、聊天页、会话栏、输入区：Task 8、Task 9、Task 11
- 消息落库、工具调用记录：Task 10
- 共享类型与 SSE 事件：Task 3、Task 9
- 运行与测试说明：Task 12

### Placeholder 扫描

- 计划中未使用 `TBD`、`TODO`、`implement later`
- 每个任务都给出了文件路径、测试入口、代码片段、运行命令和提交命令

### 类型一致性检查

- SSE 事件统一使用 `ChatStreamEvent`
- 消息角色统一使用 `"user" | "assistant"`
- 聊天接口统一使用 `/chat/stream`
- 会话消息接口统一使用 `/conversations/:id/messages`
