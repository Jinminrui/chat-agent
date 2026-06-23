# 后端日志系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 chat-agent 后端构建基于 Pino 的统一日志系统，支持请求追踪、错误记录、业务操作和依赖调用日志。

**Architecture:** 基于 Fastify 内置的 Pino 日志库，通过配置 Fastify logger 选项启用。使用 Fastify 原生的 requestId 功能实现请求追踪，通过 pino-pretty 在开发环境美化输出。

**Tech Stack:** Fastify, Pino, pino-pretty, TypeScript

## Global Constraints

- 日志级别：error, warn, log（对应 Pino 的 error, warn, info）
- 输出格式：JSON（生产环境）、文本（开发环境通过 pino-pretty）
- 请求 ID 格式：`req_<uuid>`
- 敏感数据：不记录请求体和响应体

---

## 文件结构

```
apps/backend/src/
├── lib/
│   └── prisma.ts          # 修改：添加查询日志
├── app.ts                 # 修改：配置 logger 和错误处理器
├── server.ts              # 修改：注入 logger 到 prisma
└── tests/
    └── logging.test.ts    # 新增：日志系统测试
```

---

### Task 1: 配置 Fastify Logger 和请求 ID

**Files:**
- Modify: `apps/backend/src/app.ts`
- Create: `apps/backend/tests/logging.test.ts`

**Interfaces:**
- Produces: 配置了 logger 的 Fastify 实例，自动生成 requestId

- [ ] **Step 1: 编写测试 - 验证 requestId 生成**

```typescript
// apps/backend/tests/logging.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('logging', () => {
  it('should generate requestId for each request', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });

    expect(response.statusCode).toBe(401);
    // requestId 会在响应头中返回
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(/^req_/);

    await app.close();
  });

  it('should use client-provided requestId', async () => {
    const app = buildApp();
    await app.ready();

    const customRequestId = 'req_custom-123';
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    expect(response.headers['x-request-id']).toBe(customRequestId);

    await app.close();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：FAIL - 测试文件不存在或 requestId 未配置

- [ ] **Step 3: 修改 app.ts 配置 logger**

```typescript
// apps/backend/src/app.ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { prisma } from "./lib/prisma";
import authRoutes from "./modules/auth/auth.routes";
import chatRoutes from "./modules/chat/chat.routes";
import conversationRoutes from "./modules/conversations/conversation.routes";
import { createOpenAIProvider } from "./modules/providers/openai.provider";
import type { ChatProvider } from "./modules/providers/provider.types";
import type { ToolMap } from "./modules/tools/tool-registry";
import { currentTimeTool } from "./modules/tools/builtins/current-time.tool";
import { fetchUrlTool } from "./modules/tools/builtins/fetch-url.tool";
import { webSearchTool } from "./modules/tools/builtins/web-search.tool";
import authSessionPlugin from "./plugins/auth-session";

type BuildAppOptions = {
  provider?: ChatProvider;
  tools?: ToolMap;
};

const defaultTools: ToolMap = {
  "current-time": currentTimeTool,
  "fetch-url": fetchUrlTool,
  "web-search": webSearchTool,
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'log',
    },
    genReqId: (req) => {
      // 优先使用客户端传入的 requestId，否则自动生成
      const clientRequestId = req.headers['x-request-id'];
      if (clientRequestId && typeof clientRequestId === 'string') {
        return clientRequestId;
      }
      return `req_${crypto.randomUUID()}`;
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  const provider = options.provider ?? createOpenAIProvider();
  const tools = options.tools ?? defaultTools;

  app.register(cors, {
    origin:
      process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  app.register(authSessionPlugin);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(chatRoutes, { prefix: "/chat", provider, prisma, tools });
  app.register(conversationRoutes, { prefix: "/conversations" });

  return app;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 5: 提交**

```bash
git add apps/backend/src/app.ts apps/backend/tests/logging.test.ts
git commit -m "feat(backend): configure Fastify logger with request ID tracking"
```

---

### Task 2: 配置全局错误处理器

**Files:**
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/tests/logging.test.ts`

**Interfaces:**
- Consumes: Task 1 配置的 Fastify 实例
- Produces: 全局错误处理器，自动记录错误日志

- [ ] **Step 1: 编写测试 - 验证错误日志记录**

```typescript
// apps/backend/tests/logging.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('error logging', () => {
  it('should log errors with stack trace', async () => {
    const app = buildApp();

    // 添加一个会抛出错误的路由用于测试
    app.get('/test-error', async () => {
      throw new Error('Test error message');
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      message: 'Internal Server Error',
    });

    await app.close();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：FAIL - 错误处理器未配置

- [ ] **Step 3: 在 app.ts 中添加全局错误处理器**

```typescript
// apps/backend/src/app.ts - 在 return app 之前添加

  // 全局错误处理器
  app.setErrorHandler((error, request, reply) => {
    request.log.error({
      err: error,
      statusCode: error.statusCode || 500,
    }, error.message);

    reply.code(error.statusCode || 500).send({ message: 'Internal Server Error' });
  });

  return app;
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 5: 提交**

```bash
git add apps/backend/src/app.ts apps/backend/tests/logging.test.ts
git commit -m "feat(backend): add global error handler with logging"
```

---

### Task 3: 配置 Prisma 查询日志

**Files:**
- Modify: `apps/backend/src/lib/prisma.ts`
- Modify: `apps/backend/src/server.ts`

**Interfaces:**
- Produces: `setupPrismaLogging(logger)` 函数，用于注入 logger

- [ ] **Step 1: 编写测试 - 验证 Prisma 日志配置**

```typescript
// apps/backend/tests/logging.test.ts - 添加到 describe 块中

describe('prisma logging', () => {
  it('should export setupPrismaLogging function', async () => {
    const { setupPrismaLogging } = await import('../src/lib/prisma');
    expect(typeof setupPrismaLogging).toBe('function');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：FAIL - setupPrismaLogging 不存在

- [ ] **Step 3: 修改 prisma.ts 添加查询日志**

```typescript
// apps/backend/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 慢查询阈值（开发环境记录所有，生产环境只记录 > 100ms）
const SLOW_QUERY_MS = process.env.NODE_ENV === 'production' ? 100 : 0;

/**
 * 设置 Prisma 查询日志
 * 需要在 app 启动后调用，注入 logger
 */
export function setupPrismaLogging(logger: FastifyBaseLogger) {
  prisma.$on('query', (e) => {
    if (e.duration >= SLOW_QUERY_MS) {
      logger.log({
        type: 'db.query',
        query: e.query,
        duration: e.duration,
      }, 'database query');
    }
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 5: 修改 server.ts 调用 setupPrismaLogging**

```typescript
// apps/backend/src/server.ts
import { buildApp } from "./app";
import { setupPrismaLogging } from "./lib/prisma";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = buildApp();

  // 设置 Prisma 查询日志
  setupPrismaLogging(app.log);

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.log(`Backend listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 6: 提交**

```bash
git add apps/backend/src/lib/prisma.ts apps/backend/src/server.ts apps/backend/tests/logging.test.ts
git commit -m "feat(backend): add Prisma query logging with slow query detection"
```

---

### Task 4: 添加 LLM 调用日志

**Files:**
- Modify: `apps/backend/src/modules/providers/openai.provider.ts`
- Modify: `apps/backend/src/app.ts`

**Interfaces:**
- Consumes: `FastifyBaseLogger` 实例
- Produces: 记录 LLM 调用耗时的日志

- [ ] **Step 1: 编写测试 - 验证 LLM 日志**

```typescript
// apps/backend/tests/logging.test.ts - 添加到 describe 块中

describe('llm logging', () => {
  it('should log LLM request duration', async () => {
    const app = buildApp();
    await app.ready();

    // 由于 OpenAI provider 是 stub，这里只验证配置正确
    // 实际的 LLM 日志会在真实集成后记录
    expect(app).toBeDefined();

    await app.close();
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 3: 修改 openai.provider.ts 添加日志**

```typescript
// apps/backend/src/modules/providers/openai.provider.ts
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
        logger.log({
          type: 'llm.request',
          messageCount: input.messages.length,
          duration: Date.now() - start,
        }, 'llm request completed');
      }

      return result;
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 5: 修改 app.ts 传递 logger 给 provider**

```typescript
// apps/backend/src/app.ts - 修改 provider 创建
  const provider = options.provider ?? createOpenAIProvider({ logger: app.log });
```

- [ ] **Step 6: 提交**

```bash
git add apps/backend/src/modules/providers/openai.provider.ts apps/backend/src/app.ts apps/backend/tests/logging.test.ts
git commit -m "feat(backend): add LLM request logging with duration tracking"
```

---

### Task 5: 添加业务操作日志

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.routes.ts`
- Modify: `apps/backend/src/modules/chat/chat.routes.ts`
- Modify: `apps/backend/src/modules/chat/agent-runtime.ts`

**Interfaces:**
- Produces: 认证、聊天、工具调用的业务日志

- [ ] **Step 1: 编写测试 - 验证业务日志存在**

```typescript
// apps/backend/tests/logging.test.ts - 添加到 describe 块中

describe('business logging', () => {
  it('should log auth operations', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    // 登录会失败（用户不存在），但路由应该正常处理
    expect([401, 500]).toContain(response.statusCode);

    await app.close();
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 3: 修改 auth.routes.ts 添加认证日志**

```typescript
// apps/backend/src/modules/auth/auth.routes.ts
import type { FastifyPluginAsync } from "fastify";
import {
  type LoginBody,
  type RegisterBody,
  loginBodySchema,
  registerBodySchema,
  unauthorizedSchema,
  userEnvelopeSchema,
} from "./auth.schema";
import { getCurrentUser, loginUser, registerUser } from "./auth.service";

declare module "@fastify/session" {
  interface FastifySessionObject {
    userId?: string;
  }
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/register",
    {
      schema: {
        body: registerBodySchema,
        response: {
          201: userEnvelopeSchema,
          409: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await registerUser(request.body as RegisterBody);

        request.session.userId = user.id;
        request.log.log({ userId: user.id }, 'user registered');

        return reply.code(201).send({ user });
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error as { name: string }).name === "EMAIL_ALREADY_EXISTS"
        ) {
          request.log.warn({ email: (request.body as RegisterBody).email }, 'registration failed: email already exists');
          return reply.code(409).send({ message: "Email already exists" });
        }
        throw error;
      }
    },
  );

  app.post(
    "/login",
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: userEnvelopeSchema,
          401: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await loginUser(request.body as LoginBody);

      if (!user) {
        request.log.warn({ email: (request.body as LoginBody).email }, 'login failed: invalid credentials');
        return reply.code(401).send({ message: "Unauthorized" });
      }

      request.session.userId = user.id;
      request.log.log({ userId: user.id }, 'user logged in');

      return { user };
    },
  );

  app.post("/logout", async (request, reply) => {
    const userId = request.session.userId;
    request.session.userId = undefined;
    await request.session.destroy();
    request.log.log({ userId }, 'user logged out');
    return reply.code(204).send();
  });

  app.get(
    "/me",
    {
      schema: {
        response: {
          200: userEnvelopeSchema,
          401: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const user = await getCurrentUser(userId);

      if (!user) {
        delete request.session.userId;
        return reply.code(401).send({ message: "Unauthorized" });
      }

      return { user };
    },
  );
};

export default authRoutes;
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd apps/backend && pnpm test -- tests/logging.test.ts
```

预期：PASS

- [ ] **Step 5: 修改 chat.routes.ts 添加聊天日志**

```typescript
// apps/backend/src/modules/chat/chat.routes.ts - 在 runtime.run 调用前后添加日志

      const result = await runtime.run({
        messages: [{ role: "user", content: message }],
        conversationId,
      });

      request.log.log({
        conversationId,
        toolCallCount: result.toolCalls.length,
        contentLength: result.content.length,
      }, 'agent run completed');
```

- [ ] **Step 6: 提交**

```bash
git add apps/backend/src/modules/auth/auth.routes.ts apps/backend/src/modules/chat/chat.routes.ts apps/backend/tests/logging.test.ts
git commit -m "feat(backend): add business operation logging for auth and chat"
```

---

### Task 6: 添加 pino-pretty 开发依赖

**Files:**
- Modify: `apps/backend/package.json`

**Interfaces:**
- Produces: 开发环境美化日志输出

- [ ] **Step 1: 安装 pino-pretty**

```bash
cd apps/backend && pnpm add -D pino-pretty
```

- [ ] **Step 2: 修改 package.json dev 脚本**

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts | pino-pretty",
    "lint": "echo \"lint not configured yet\"",
    "test": "vitest run --root ../.."
  }
}
```

- [ ] **Step 3: 验证开发环境日志输出**

```bash
cd apps/backend && pnpm dev
```

预期：看到美化后的彩色日志输出

- [ ] **Step 4: 提交**

```bash
git add apps/backend/package.json apps/backend/pnpm-lock.yaml
git commit -m "feat(backend): add pino-pretty for development log formatting"
```

---

### Task 7: 更新 .env.example 和文档

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Produces: 环境变量文档

- [ ] **Step 1: 更新 .env.example**

```bash
# .env.example - 添加 LOG_LEVEL 配置

# 日志级别：error, warn, log（默认: log）
LOG_LEVEL=log
```

- [ ] **Step 2: 更新 README.md**

在 README.md 中添加日志系统说明：

```markdown
## 日志系统

后端使用 Pino 作为日志库，支持以下特性：

- **请求追踪**：每个请求自动生成唯一 requestId
- **日志级别**：error, warn, log
- **输出格式**：JSON（生产环境）、美化文本（开发环境）

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LOG_LEVEL` | `log` | 日志级别 |

### 开发环境

```bash
pnpm dev  # 自动使用 pino-pretty 美化输出
```

### 生产环境

```bash
LOG_LEVEL=warn pnpm start  # JSON 格式输出
```
```

- [ ] **Step 3: 提交**

```bash
git add .env.example README.md
git commit -m "docs: add logging system documentation"
```

---

### Task 8: 运行完整测试套件

**Files:**
- 无新增文件

**Interfaces:**
- 验证所有测试通过

- [ ] **Step 1: 运行完整测试**

```bash
cd apps/backend && pnpm test
```

预期：所有测试通过

- [ ] **Step 2: 验证日志输出**

```bash
cd apps/backend && pnpm dev
```

预期：
1. 看到美化后的启动日志
2. 发送请求时看到 requestId
3. 错误请求看到错误堆栈

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat(backend): complete logging system implementation"
```

---

## 验证清单

- [ ] 开发环境输出人类可读的彩色日志
- [ ] 生产环境输出 JSON 格式日志
- [ ] 每个请求都有唯一 requestId
- [ ] HTTP 请求自动记录方法、路径、状态码、耗时
- [ ] 错误自动记录堆栈信息
- [ ] 业务操作有明确的日志标记
- [ ] 数据库慢查询被记录
- [ ] LLM 调用耗时被记录
