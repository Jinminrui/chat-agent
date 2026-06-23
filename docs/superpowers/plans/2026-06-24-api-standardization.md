# API 接口规范化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一后端接口响应格式为 `{code, msg, data}`，SSE 流式响应符合 W3C 标准，前端类型封装完善

**Architecture:** 后端使用 Fastify 插件统一响应格式，SSE 使用标准事件格式支持断线重连和心跳；前端封装统一的 API 客户端和类型定义

**Tech Stack:** Fastify, TypeScript, React, TanStack Query

## Global Constraints

- 所有普通接口响应格式统一为 `{code: number, msg: string, data: T}`
- 成功响应 code 为 0，错误响应 code 为业务状态码
- HTTP 状态码遵循 RESTful 风格（200/201 成功，400 参数错误，401 认证错误，500 系统错误）
- SSE 流式响应使用标准 W3C 格式（event:, id:, data:）
- SSE 支持断线重连（Last-Event-ID）和心跳机制（30 秒间隔）

---

### Task 1: 创建后端响应工具函数

**Files:**
- Create: `apps/backend/src/lib/response.ts`
- Create: `apps/backend/src/lib/error-codes.ts`
- Test: `apps/backend/tests/response.test.ts`

**Interfaces:**
- Produces: `success<T>(data: T, msg?: string)` 和 `error(code: number, msg: string)` 函数
- Produces: `ErrorCodes` 常量对象

- [ ] **Step 1: 创建 response.ts 文件**

```typescript
// apps/backend/src/lib/response.ts

export type ApiResponse<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

export function success<T>(data: T, msg = 'ok'): ApiResponse<T> {
  return { code: 0, msg, data };
}

export function error(code: number, msg: string, data = null): ApiResponse<null> {
  return { code, msg, data };
}
```

- [ ] **Step 2: 创建 error-codes.ts 文件**

```typescript
// apps/backend/src/lib/error-codes.ts

export const ErrorCodes = {
  // 通用
  SUCCESS: 0,
  UNKNOWN_ERROR: 5000,
  
  // 参数错误 (1xxx)
  PARAM_INVALID: 1000,
  PARAM_MISSING: 1001,
  PARAM_FORMAT: 1002,
  PARAM_VALUE: 1003,
  
  // 认证错误 (2xxx)
  AUTH_INVALID: 2000,
  AUTH_NOT_LOGGED_IN: 2001,
  AUTH_CREDENTIALS_INVALID: 2002,
  AUTH_EXPIRED: 2003,
  
  // Auth 模块 (101x-102x)
  AUTH_EMAIL_EXISTS: 1010,
  AUTH_USERNAME_EXISTS: 1011,
  AUTH_PASSWORD_WEAK: 1012,
  AUTH_EMAIL_FORMAT: 1013,
  AUTH_USERNAME_FORMAT: 1014,
  AUTH_LOGIN_FAILED: 1020,
  AUTH_LOGIN_LOCKED: 1021,
  
  // Chat 模块 (201x-202x)
  CHAT_CONVERSATION_NOT_FOUND: 2010,
  CHAT_CONVERSATION_NOT_OWNER: 2011,
  CHAT_MESSAGE_EMPTY: 2012,
  CHAT_MESSAGE_TOO_LONG: 2013,
  CHAT_TOOL_CALL_FAILED: 2020,
  CHAT_TOOL_NOT_FOUND: 2021,
  CHAT_TOOL_CALL_LIMIT: 2022,
  
  // Conversation 模块 (301x-302x)
  CONVERSATION_NOT_FOUND: 3010,
  CONVERSATION_NOT_OWNER: 3011,
  CONVERSATION_TITLE_INVALID: 3012,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

- [ ] **Step 3: 编写单元测试**

```typescript
// apps/backend/tests/response.test.ts

import { describe, it, expect } from 'vitest';
import { success, error } from '../src/lib/response';
import { ErrorCodes } from '../src/lib/error-codes';

describe('response helpers', () => {
  it('success returns code 0 with data', () => {
    const result = success({ id: 1 });
    expect(result).toEqual({ code: 0, msg: 'ok', data: { id: 1 } });
  });

  it('success allows custom message', () => {
    const result = success({ id: 1 }, 'created');
    expect(result).toEqual({ code: 0, msg: 'created', data: { id: 1 } });
  });

  it('error returns code with message', () => {
    const result = error(ErrorCodes.AUTH_NOT_LOGGED_IN, '未登录');
    expect(result).toEqual({ code: 2001, msg: '未登录', data: null });
  });
});

describe('ErrorCodes', () => {
  it('has unique codes', () => {
    const values = Object.values(ErrorCodes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('SUCCESS is 0', () => {
    expect(ErrorCodes.SUCCESS).toBe(0);
  });
});
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd apps/backend && pnpm test tests/response.test.ts`
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add apps/backend/src/lib/response.ts apps/backend/src/lib/error-codes.ts apps/backend/tests/response.test.ts
git commit -m "feat(backend): add response helpers and error codes"
```

---

### Task 2: 创建 Fastify 响应格式插件

**Files:**
- Create: `apps/backend/src/plugins/response-format.ts`
- Test: `apps/backend/tests/response-format.test.ts`

**Interfaces:**
- Consumes: `success` 和 `error` 函数
- Produces: Fastify 插件，装饰 `reply.success()` 和 `reply.error()` 方法

- [ ] **Step 1: 创建插件文件**

```typescript
// apps/backend/src/plugins/response-format.ts

import fp from 'fastify-plugin';
import { success, error } from '../lib/response';

declare module 'fastify' {
  interface FastifyReply {
    success<T>(data: T, msg?: string): FastifyReply;
    error(code: number, msg: string): FastifyReply;
  }
}

export default fp(async (app) => {
  app.decorateReply('success', function (data: unknown, msg = 'ok') {
    return this.send(success(data, msg));
  });
  
  app.decorateReply('error', function (code: number, msg: string) {
    return this.send(error(code, msg));
  });
});
```

- [ ] **Step 2: 编写集成测试**

```typescript
// apps/backend/tests/response-format.test.ts

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import responseFormatPlugin from '../src/plugins/response-format';

describe('response-format plugin', () => {
  it('reply.success returns unified format', async () => {
    const app = Fastify();
    await app.register(responseFormatPlugin);
    
    app.get('/test', async (req, reply) => {
      return reply.success({ id: 1 });
    });
    
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ code: 0, msg: 'ok', data: { id: 1 } });
  });
  
  it('reply.error returns unified format', async () => {
    const app = Fastify();
    await app.register(responseFormatPlugin);
    
    app.get('/test', async (req, reply) => {
      return reply.code(401).error(2001, '未登录');
    });
    
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ code: 2001, msg: '未登录', data: null });
  });
});
```

- [ ] **Step 3: 运行测试验证通过**

Run: `cd apps/backend && pnpm test tests/response-format.test.ts`
Expected: PASS

- [ ] **Step 4: 提交代码**

```bash
git add apps/backend/src/plugins/response-format.ts apps/backend/tests/response-format.test.ts
git commit -m "feat(backend): add response format plugin"
```

---

### Task 3: 创建 SSE 工具函数

**Files:**
- Create: `apps/backend/src/lib/sse.ts`
- Test: `apps/backend/tests/sse.test.ts`

**Interfaces:**
- Produces: `SSEWriter` 类，提供 `delta()`、`toolStart()`、`toolEnd()`、`done()`、`error()`、`heartbeat()` 方法

- [ ] **Step 1: 创建 sse.ts 文件**

```typescript
// apps/backend/src/lib/sse.ts

import type { FastifyReply } from 'fastify';

export class SSEWriter {
  private id = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  
  constructor(
    private reply: FastifyReply,
    private heartbeatInterval = 30000
  ) {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    this.startHeartbeat();
  }
  
  write(event: string, data: unknown) {
    const id = ++this.id;
    this.reply.raw.write(`event: ${event}\nid: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  
  delta(content: string) {
    this.write('delta', { content });
  }
  
  toolStart(toolName: string, input: unknown) {
    this.write('tool.start', { toolName, input });
  }
  
  toolEnd(toolName: string, output: unknown) {
    this.write('tool.end', { toolName, output });
  }
  
  done(messageId: string, totalTokens?: number) {
    this.write('done', { messageId, totalTokens });
    this.cleanup();
  }
  
  error(code: number, msg: string, details?: unknown) {
    this.write('error', { code, msg, ...details });
    this.cleanup();
  }
  
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.write('heartbeat', { timestamp: Date.now() });
    }, this.heartbeatInterval);
  }
  
  private cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
```

- [ ] **Step 2: 编写单元测试**

```typescript
// apps/backend/tests/sse.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEWriter } from '../src/lib/sse';

describe('SSEWriter', () => {
  let mockReply: any;
  let mockRaw: any;
  
  beforeEach(() => {
    vi.useFakeTimers();
    mockRaw = {
      writeHead: vi.fn(),
      write: vi.fn(),
    };
    mockReply = { raw: mockRaw };
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('sets correct headers', () => {
    new SSEWriter(mockReply);
    expect(mockRaw.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
  });
  
  it('writes delta events correctly', () => {
    const writer = new SSEWriter(mockReply);
    writer.delta('hello');
    
    expect(mockRaw.write).toHaveBeenCalledWith(
      'event: delta\nid: 1\ndata: {"content":"hello"}\n\n'
    );
  });
  
  it('increments id for each event', () => {
    const writer = new SSEWriter(mockReply);
    writer.delta('a');
    writer.delta('b');
    
    const calls = mockRaw.write.mock.calls;
    expect(calls[0][0]).toContain('id: 1');
    expect(calls[1][0]).toContain('id: 2');
  });
  
  it('writes tool events correctly', () => {
    const writer = new SSEWriter(mockReply);
    writer.toolStart('web-search', { query: 'test' });
    writer.toolEnd('web-search', { result: 'ok' });
    
    const calls = mockRaw.write.mock.calls;
    expect(calls[0][0]).toContain('event: tool.start');
    expect(calls[1][0]).toContain('event: tool.end');
  });
  
  it('writes done event and cleans up', () => {
    const writer = new SSEWriter(mockReply);
    writer.done('msg_123', 100);
    
    expect(mockRaw.write).toHaveBeenCalledWith(
      'event: done\nid: 1\ndata: {"messageId":"msg_123","totalTokens":100}\n\n'
    );
  });
  
  it('sends heartbeat on interval', () => {
    const writer = new SSEWriter(mockReply, 1000);
    
    vi.advanceTimersByTime(1000);
    expect(mockRaw.write).toHaveBeenCalledTimes(1);
    expect(mockRaw.write.mock.calls[0][0]).toContain('event: heartbeat');
    
    vi.advanceTimersByTime(1000);
    expect(mockRaw.write).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: 运行测试验证通过**

Run: `cd apps/backend && pnpm test tests/sse.test.ts`
Expected: PASS

- [ ] **Step 4: 提交代码**

```bash
git add apps/backend/src/lib/sse.ts apps/backend/tests/sse.test.ts
git commit -m "feat(backend): add SSE writer utility"
```

---

### Task 4: 注册插件并修改 auth 路由

**Files:**
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/src/modules/auth/auth.routes.ts`
- Modify: `apps/backend/src/modules/auth/auth.schema.ts`
- Test: `apps/backend/tests/auth.routes.test.ts`

**Interfaces:**
- Consumes: `response-format` 插件
- Consumes: `ErrorCodes` 常量

- [ ] **Step 1: 在 app.ts 中注册插件**

```typescript
// apps/backend/src/app.ts (修改)

import responseFormatPlugin from './plugins/response-format';

// 在 app.register(authSessionPlugin) 之后添加
app.register(responseFormatPlugin);
```

- [ ] **Step 2: 修改 auth.routes.ts 使用统一响应格式**

```typescript
// apps/backend/src/modules/auth/auth.routes.ts (修改)

import { ErrorCodes } from '../../lib/error-codes';

// 修改 register 路由
async (request, reply) => {
  try {
    const user = await registerUser(request.body as RegisterBody);
    request.session.userId = user.id;
    request.log.info({ userId: user.id }, 'user registered');
    return reply.code(201).success({ user });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "EMAIL_ALREADY_EXISTS"
    ) {
      request.log.warn({ email: (request.body as RegisterBody).email }, 'registration failed: email already exists');
      return reply.code(409).error(ErrorCodes.AUTH_EMAIL_EXISTS, "邮箱已存在");
    }
    throw error;
  }
}

// 修改 login 路由
async (request, reply) => {
  const user = await loginUser(request.body as LoginBody);
  if (!user) {
    request.log.warn({ emailOrUsername: (request.body as LoginBody).emailOrUsername }, 'login failed: invalid credentials');
    return reply.code(401).error(ErrorCodes.AUTH_LOGIN_FAILED, "登录失败：凭证错误");
  }
  request.session.userId = user.id;
  request.log.info({ userId: user.id }, 'user logged in');
  return reply.success({ user });
}

// 修改 logout 路由
async (request, reply) => {
  const userId = request.session.userId;
  request.session.userId = undefined;
  await request.session.destroy();
  request.log.info({ userId }, 'user logged out');
  return reply.code(204).send();
}

// 修改 me 路由
async (request, reply) => {
  const userId = request.session.userId;
  if (!userId) {
    return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
  }
  const user = await getCurrentUser(userId);
  if (!user) {
    delete request.session.userId;
    return reply.code(401).error(ErrorCodes.AUTH_CREDENTIALS_INVALID, "登录凭证无效");
  }
  return reply.success({ user });
}
```

- [ ] **Step 3: 更新 auth.schema.ts 中的响应 Schema**

```typescript
// apps/backend/src/modules/auth/auth.schema.ts (修改)

export const successResponseSchema = {
  type: "object",
  required: ["code", "msg", "data"],
  properties: {
    code: { type: "number", const: 0 },
    msg: { type: "string", const: "ok" },
    data: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const errorResponseSchema = {
  type: "object",
  required: ["code", "msg", "data"],
  properties: {
    code: { type: "number" },
    msg: { type: "string" },
    data: { type: "null" },
  },
  additionalProperties: false,
} as const;
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd apps/backend && pnpm test`
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add apps/backend/src/app.ts apps/backend/src/modules/auth/auth.routes.ts apps/backend/src/modules/auth/auth.schema.ts
git commit -m "feat(backend): migrate auth routes to unified response format"
```

---

### Task 5: 修改 conversation 路由

**Files:**
- Modify: `apps/backend/src/modules/conversations/conversation.routes.ts`
- Test: `apps/backend/tests/conversation.routes.test.ts`

**Interfaces:**
- Consumes: `ErrorCodes` 常量
- Consumes: `reply.success()` 和 `reply.error()` 方法

- [ ] **Step 1: 修改 conversation.routes.ts 使用统一响应格式**

```typescript
// apps/backend/src/modules/conversations/conversation.routes.ts (修改)

import { ErrorCodes } from '../../lib/error-codes';

// 修改 create 路由
async (request, reply) => {
  const userId = request.session.userId;
  if (!userId) {
    return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
  }
  const conversation = await createConversation(userId);
  return reply.code(201).success({ conversation });
}

// 修改 list 路由
async (request, reply) => {
  const userId = request.session.userId;
  if (!userId) {
    return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
  }
  const items = await listConversations(userId);
  return reply.success({ items });
}

// 修改 messages 路由
async (request, reply) => {
  const userId = request.session.userId;
  if (!userId) {
    return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
  }
  const items = await listMessages(userId, request.params.id);
  if (!items) {
    return reply.code(404).error(ErrorCodes.CONVERSATION_NOT_FOUND, "会话不存在");
  }
  return reply.success({ items });
}
```

- [ ] **Step 2: 运行测试验证通过**

Run: `cd apps/backend && pnpm test`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add apps/backend/src/modules/conversations/conversation.routes.ts
git commit -m "feat(backend): migrate conversation routes to unified response format"
```

---

### Task 6: 修改 chat 路由（SSE 部分）

**Files:**
- Modify: `apps/backend/src/modules/chat/chat.routes.ts`
- Modify: `packages/shared/src/events.ts`

**Interfaces:**
- Consumes: `SSEWriter` 类
- Consumes: `ErrorCodes` 常量
- Produces: 新的 SSE 事件格式

- [ ] **Step 1: 更新 shared 包中的事件类型定义**

```typescript
// packages/shared/src/events.ts (修改)

import type { ToolCallStatus } from "./contracts";

export type ChatStreamEvent =
  | { event: "delta"; id: number; data: { content: string } }
  | { event: "tool.start"; id: number; data: { toolName: string; input: unknown } }
  | { event: "tool.end"; id: number; data: { toolName: string; output: unknown } }
  | { event: "done"; id: number; data: { messageId: string; totalTokens?: number } }
  | { event: "error"; id: number; data: { code: number; msg: string } }
  | { event: "heartbeat"; id: number; data: { timestamp: number } };
```

- [ ] **Step 2: 修改 chat.routes.ts 使用 SSEWriter**

```typescript
// apps/backend/src/modules/chat/chat.routes.ts (修改)

import { SSEWriter } from '../../lib/sse';
import { ErrorCodes } from '../../lib/error-codes';

// 修改 stream 路由
async (request, reply) => {
  const userId = request.session.userId;
  if (!userId) {
    return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
  }
  
  const { conversationId, message } = request.body as {
    conversationId: string;
    message: string;
  };
  
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId: true },
  });
  
  if (!conversation || conversation.userId !== userId) {
    return reply.code(404).error(ErrorCodes.CHAT_CONVERSATION_NOT_FOUND, "会话不存在");
  }
  
  // Persist user message
  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: message,
    },
    select: { id: true },
  });
  
  // 使用 SSEWriter
  const sse = new SSEWriter(reply);
  
  // Create agent runtime with streaming callbacks
  const runtime = createAgentRuntime({
    provider,
    tools,
    maxToolCalls: MAX_TOOL_CALLS,
    checkpointService,
    onToolCall({ toolName, input }) {
      sse.toolStart(toolName, input);
    },
    onToolResult({ toolName, output }) {
      sse.toolEnd(toolName, output);
    },
  });
  
  const result = await runtime.run({
    messages: [{ role: "user", content: message }],
    conversationId,
  });
  
  request.log.info({
    conversationId,
    toolCallCount: result.toolCalls.length,
    contentLength: result.content.length,
  }, 'agent run completed');
  
  // Persist assistant message
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: result.content,
    },
    select: { id: true },
  });
  
  // Persist tool calls
  for (const tc of result.toolCalls) {
    await prisma.toolCall.create({
      data: {
        conversationId,
        messageId: assistantMessage.id,
        toolName: tc.toolName,
        toolInput: tc.input as Prisma.InputJsonValue,
        toolOutput: tc.output as Prisma.InputJsonValue,
        status: "completed",
      },
    });
  }
  
  // Cleanup old checkpoints (keep latest 5)
  await checkpointService.cleanup(conversationId, 5);
  
  // 使用 SSEWriter 发送事件
  sse.delta(result.content);
  sse.done(assistantMessage.id);
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `cd apps/backend && pnpm test`
Expected: PASS

- [ ] **Step 4: 提交代码**

```bash
git add apps/backend/src/modules/chat/chat.routes.ts packages/shared/src/events.ts
git commit -m "feat(backend): migrate chat stream to SSE writer"
```

---

### Task 7: 创建前端类型定义

**Files:**
- Create: `apps/web/types/api.ts`
- Create: `apps/web/types/auth.ts`
- Create: `apps/web/types/chat.ts`

**Interfaces:**
- Produces: `ApiResponse<T>`、`ApiSuccess<T>`、`ApiError` 类型
- Produces: `isSuccess()` 和 `isError()` 类型守卫函数
- Produces: `User`、`LoginRequest`、`RegisterRequest` 等业务类型

- [ ] **Step 1: 创建 api.ts 类型定义**

```typescript
// apps/web/types/api.ts

/** 统一 API 响应结构 */
export type ApiResponse<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

/** 成功响应 */
export type ApiSuccess<T = unknown> = {
  code: 0;
  msg: 'ok';
  data: T;
};

/** 错误响应 */
export type ApiError = {
  code: number;
  msg: string;
  data: null;
};

/** 判断是否为成功响应 */
export function isSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.code === 0;
}

/** 判断是否为错误响应 */
export function isError(res: ApiResponse): res is ApiError {
  return res.code !== 0;
}
```

- [ ] **Step 2: 创建 auth.ts 类型定义**

```typescript
// apps/web/types/auth.ts

export type User = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

export type LoginRequest = {
  emailOrUsername: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  user: User;
};

export type RegisterResponse = {
  user: User;
};
```

- [ ] **Step 3: 创建 chat.ts 类型定义**

```typescript
// apps/web/types/chat.ts

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type SendMessageRequest = {
  conversationId: string;
  message: string;
};

export type CreateConversationResponse = {
  conversation: Conversation;
};

export type ListConversationsResponse = {
  items: Conversation[];
};

export type ListMessagesResponse = {
  items: ChatMessage[];
};
```

- [ ] **Step 4: 提交代码**

```bash
git add apps/web/types/
git commit -m "feat(web): add API and business type definitions"
```

---

### Task 8: 重构前端 API 客户端

**Files:**
- Modify: `apps/web/lib/api/client.ts`
- Modify: `apps/web/lib/api/auth.ts`
- Modify: `apps/web/lib/api/conversations.ts`

**Interfaces:**
- Consumes: `ApiResponse<T>`、`isSuccess()` 类型
- Produces: 统一的 API 客户端，自动处理响应格式

- [ ] **Step 1: 重构 client.ts**

```typescript
// apps/web/lib/api/client.ts (修改)

import { type ApiResponse, isSuccess, ApiError } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (response.status === 204) {
    return { code: 0, msg: 'ok', data: undefined as T };
  }
  
  const data: ApiResponse<T> = await response.json();
  
  if (!isSuccess(data)) {
    throw new ApiError(data.code, data.msg);
  }
  
  return data;
}

export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'GET' });
  },
  
  post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  
  put<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  
  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export class ApiError extends Error {
  constructor(
    public code: number,
    public msg: string
  ) {
    super(msg);
    this.name = 'ApiError';
  }
}
```

- [ ] **Step 2: 重构 auth.ts**

```typescript
// apps/web/lib/api/auth.ts (修改)

import { api } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '@/types/auth';

export async function login(emailOrUsername: string, password: string): Promise<User> {
  const response = await api.post<LoginResponse>('/auth/login', { emailOrUsername, password });
  return response.data.user;
}

export async function register(params: RegisterRequest): Promise<User> {
  const response = await api.post<RegisterResponse>('/auth/register', params);
  return response.data.user;
}

export async function logout(): Promise<void> {
  await api.post<void>('/auth/logout');
}

export async function getMe(): Promise<User> {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.data.user;
}
```

- [ ] **Step 3: 重构 conversations.ts**

```typescript
// apps/web/lib/api/conversations.ts (修改)

import { api } from './client';
import type { Conversation, ChatMessage, CreateConversationResponse, ListConversationsResponse, ListMessagesResponse } from '@/types/chat';

export async function createConversation(): Promise<Conversation> {
  const response = await api.post<CreateConversationResponse>('/conversations');
  return response.data.conversation;
}

export async function listConversations(): Promise<Conversation[]> {
  const response = await api.get<ListConversationsResponse>('/conversations');
  return response.data.items;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const response = await api.get<ListMessagesResponse>(`/conversations/${conversationId}/messages`);
  return response.data.items;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd apps/web && pnpm test`
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add apps/web/lib/api/
git commit -m "feat(web): refactor API client with unified response handling"
```

---

### Task 9: 重构前端 SSE 处理

**Files:**
- Modify: `apps/web/lib/api/chat.ts`
- Modify: `apps/web/features/chat/use-chat-stream.ts`
- Modify: `packages/shared/src/events.ts`

**Interfaces:**
- Consumes: 新的 SSE 事件格式
- Produces: 更新后的 `ChatStreamEvent` 类型

- [ ] **Step 1: 更新 shared 包中的事件类型**

```typescript
// packages/shared/src/events.ts (修改)

export type ChatStreamEvent =
  | { event: "delta"; id: number; data: { content: string } }
  | { event: "tool.start"; id: number; data: { toolName: string; input: unknown } }
  | { event: "tool.end"; id: number; data: { toolName: string; output: unknown } }
  | { event: "done"; id: number; data: { messageId: string; totalTokens?: number } }
  | { event: "error"; id: number; data: { code: number; msg: string } }
  | { event: "heartbeat"; id: number; data: { timestamp: number } };
```

- [ ] **Step 2: 重构 chat.ts 使用新的 SSE 格式**

```typescript
// apps/web/lib/api/chat.ts (修改)

import type { ChatStreamEvent } from "@chat-agent/shared";

export async function streamChat(
  input: { conversationId: string; message: string },
  handlers: {
    onEvent: (event: ChatStreamEvent) => void;
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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const event = line.slice(7);
        // 继续读取 id 和 data
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        handlers.onEvent({ event: 'delta', id: 0, data });
      }
    }
  }

  handlers.onComplete?.();
}
```

- [ ] **Step 3: 重构 use-chat-stream.ts**

```typescript
// apps/web/features/chat/use-chat-stream.ts (修改)

import { useState, useCallback, useRef } from "react";
import type { ChatStreamEvent } from "@chat-agent/shared";
import { streamChat } from "@/lib/api/chat";

export function useChatStream(opts?: { onComplete?: (response: string) => void }) {
  const [streaming, setStreaming] = useState(false);
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const accumulatedRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const send = useCallback(
    async (conversationId: string, message: string) => {
      setStreaming(true);
      setDelta("");
      setError(null);
      accumulatedRef.current = "";

      try {
        await streamChat(
          { conversationId, message },
          {
            onEvent(event: ChatStreamEvent) {
              if (event.event === "delta") {
                accumulatedRef.current += event.data.content;
                setDelta(accumulatedRef.current);
              } else if (event.event === "error") {
                throw new Error(event.data.msg);
              }
            },
            onComplete() {
              setStreaming(false);
              optsRef.current?.onComplete?.(accumulatedRef.current);
            },
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStreaming(false);
      }
    },
    [],
  );

  return { streaming, delta, error, send };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd apps/web && pnpm test`
Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
git add apps/web/lib/api/chat.ts apps/web/features/chat/use-chat-stream.ts packages/shared/src/events.ts
git commit -m "feat(web): refactor SSE handling with new event format"
```

---

### Task 10: 更新前端 API 路由前缀

**Files:**
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/web/lib/api/client.ts`
- Modify: `apps/web/lib/api/auth.ts`
- Modify: `apps/web/lib/api/conversations.ts`
- Modify: `apps/web/lib/api/chat.ts`

**Interfaces:**
- 所有 API 路由添加 `/api` 前缀

- [ ] **Step 1: 修改后端 app.ts 添加 /api 前缀**

```typescript
// apps/backend/src/app.ts (修改)

app.register(authRoutes, { prefix: "/api/auth" });
app.register(chatRoutes, { prefix: "/api/chat", provider, prisma, tools });
app.register(conversationRoutes, { prefix: "/api/conversations" });
```

- [ ] **Step 2: 修改前端 API 调用路径**

```typescript
// apps/web/lib/api/auth.ts (修改)

export async function login(emailOrUsername: string, password: string): Promise<User> {
  const response = await api.post<LoginResponse>('/api/auth/login', { emailOrUsername, password });
  return response.data.user;
}

export async function register(params: RegisterRequest): Promise<User> {
  const response = await api.post<RegisterResponse>('/api/auth/register', params);
  return response.data.user;
}

export async function logout(): Promise<void> {
  await api.post<void>('/api/auth/logout');
}

export async function getMe(): Promise<User> {
  const response = await api.get<{ user: User }>('/api/auth/me');
  return response.data.user;
}
```

```typescript
// apps/web/lib/api/conversations.ts (修改)

export async function createConversation(): Promise<Conversation> {
  const response = await api.post<CreateConversationResponse>('/api/conversations');
  return response.data.conversation;
}

export async function listConversations(): Promise<Conversation[]> {
  const response = await api.get<ListConversationsResponse>('/api/conversations');
  return response.data.items;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const response = await api.get<ListMessagesResponse>(`/api/conversations/${conversationId}/messages`);
  return response.data.items;
}
```

```typescript
// apps/web/lib/api/chat.ts (修改)

export async function streamChat(
  input: { conversationId: string; message: string },
  handlers: {
    onEvent: (event: ChatStreamEvent) => void;
    onComplete?: () => void;
  },
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  // ... 其余代码
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `cd apps/backend && pnpm test && cd ../web && pnpm test`
Expected: PASS

- [ ] **Step 4: 提交代码**

```bash
git add apps/backend/src/app.ts apps/web/lib/api/
git commit -m "feat: add /api prefix to all routes"
```

---

## 验收标准

1. 所有普通接口返回 `{code, msg, data}` 格式
2. 成功响应 code 为 0，错误响应 code 为业务状态码
3. HTTP 状态码遵循 RESTful 风格
4. SSE 流式响应使用标准 W3C 格式
5. SSE 支持断线重连（Last-Event-ID）
6. SSE 心跳机制正常工作（30 秒间隔）
7. 前端 API 客户端正确处理统一响应格式
8. 前端类型定义完善
9. 所有测试通过
10. 代码已提交到 git
