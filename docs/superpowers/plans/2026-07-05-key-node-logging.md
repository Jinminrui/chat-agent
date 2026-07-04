# 日志关键节点输出优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收敛前后端默认日志输出，只保留聊天链路关键摘要和错误，移除高频明细。

**Architecture:** 沿用现有 Fastify/Pino 日志体系，不新增日志封装层。后端通过关闭 Fastify 自动请求日志和禁用默认 Prisma query 事件日志来降噪，保留现有聊天、LLM、错误摘要日志；前端移除 SSE chunk 级 `console.log`。

**Tech Stack:** Fastify, Pino, Prisma, Next.js, TypeScript, Vitest

---

## File Structure

- Modify: `apps/backend/src/app.ts`  
  负责创建 Fastify 实例。将默认 logger 调整为不输出自动请求/响应日志，同时保留 `app.log` 和 `request.log` 可用于业务关键节点。

- Modify: `apps/backend/src/lib/prisma.ts`  
  负责 Prisma 客户端和查询日志挂载。默认不订阅 query 事件，避免每条 SQL 进入 `info` 输出。

- Modify: `apps/backend/tests/logging.test.ts`  
  增加后端日志降噪行为测试，覆盖 Fastify 自动请求日志关闭和 Prisma query 明细默认关闭。

- Modify: `apps/web/lib/api/chat.ts`  
  负责消费 SSE 聊天流。移除 chunk 级 `console.log`。

- Modify: `apps/web/tests/chat/stream-chat.test.ts`  
  增加前端正常流不调用 `console.log` 的测试。

## Task 1: 后端默认关闭自动请求日志

**Files:**
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/tests/logging.test.ts`

- [ ] **Step 1: 写失败测试，确认 Fastify 自动请求日志被关闭**

在 `apps/backend/tests/logging.test.ts` 的 `describe('logging', () => { ... })` 中追加测试：

```typescript
  it('should disable automatic request logging by default', async () => {
    const app = buildApp();

    expect(app.initialConfig.disableRequestLogging).toBe(true);

    await app.close();
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter backend test apps/backend/tests/logging.test.ts
```

Expected: FAIL，`app.initialConfig.disableRequestLogging` 不是 `true`。

- [ ] **Step 3: 最小实现，关闭 Fastify 自动请求日志**

修改 `apps/backend/src/app.ts` 中 Fastify 配置：

```typescript
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    disableRequestLogging: true,
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
```

- [ ] **Step 4: 运行后端日志测试，确认通过**

Run:

```bash
pnpm --filter backend test apps/backend/tests/logging.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/backend/src/app.ts apps/backend/tests/logging.test.ts
git commit -m "fix(logging): 关闭默认请求完成日志"
```

## Task 2: 后端默认关闭 Prisma query 明细日志

**Files:**
- Modify: `apps/backend/src/lib/prisma.ts`
- Modify: `apps/backend/tests/logging.test.ts`

- [ ] **Step 1: 写失败测试，确认默认不注册 Prisma query 日志监听**

在 `apps/backend/tests/logging.test.ts` 的 `describe('prisma logging', () => { ... })` 中追加测试：

```typescript
  it('should skip Prisma query logging unless explicitly enabled', async () => {
    const { prisma, setupPrismaLogging } = await import('../src/lib/prisma');
    const logger = {
      info: vi.fn(),
    };
    const on = vi.spyOn(prisma, '$on');

    setupPrismaLogging(logger as never);

    expect(on).not.toHaveBeenCalledWith('query', expect.any(Function));
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter backend test apps/backend/tests/logging.test.ts
```

Expected: FAIL，当前 `setupPrismaLogging` 会订阅 `query` 事件。

- [ ] **Step 3: 最小实现，给 Prisma query 日志加显式开关**

修改 `apps/backend/src/lib/prisma.ts`：

```typescript
import { Prisma, PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

const enablePrismaQueryLogs = process.env.LOG_PRISMA_QUERIES === "true";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      ...(enablePrismaQueryLogs
        ? ([{ level: "query", emit: "event" }] as const)
        : []),
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const SLOW_QUERY_MS = process.env.NODE_ENV === "production" ? 100 : 0;

/**
 * 设置 Prisma 查询日志。
 * 默认不输出 query 明细；仅当 LOG_PRISMA_QUERIES=true 时订阅 query 事件。
 */
export function setupPrismaLogging(logger: FastifyBaseLogger) {
  if (!enablePrismaQueryLogs) {
    return;
  }

  prisma.$on("query" as never, (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_MS) {
      logger.info(
        {
          type: "db.query",
          duration: e.duration,
        },
        "database query",
      );
    }
  });
}
```

注意：默认不记录 SQL 文本；即使显式打开 query 日志，也只记录耗时摘要。

- [ ] **Step 4: 运行后端日志测试**

Run:

```bash
pnpm --filter backend test apps/backend/tests/logging.test.ts
```

Expected: PASS。

- [ ] **Step 5: 运行后端类型检查**

Run:

```bash
pnpm lint:backend
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add apps/backend/src/lib/prisma.ts apps/backend/tests/logging.test.ts
git commit -m "fix(logging): 默认关闭 Prisma 查询明细日志"
```

## Task 3: 前端移除 SSE chunk 调试输出

**Files:**
- Modify: `apps/web/lib/api/chat.ts`
- Modify: `apps/web/tests/chat/stream-chat.test.ts`

- [ ] **Step 1: 写失败测试，确认正常流不调用 console.log**

在 `apps/web/tests/chat/stream-chat.test.ts` 的 `describe("streamChat", () => { ... })` 中追加测试：

```typescript
  it("does not log raw SSE chunks during a successful stream", async () => {
    const sseBody = [
      "event: delta",
      "id: 1",
      'data: {"content":"Hello"}',
      "",
      "event: done",
      "id: 2",
      'data: {"messageId":"msg-1"}',
      "",
    ].join("\n");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseBody));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await streamChat(
      { conversationId: "conv-1", message: "Hi" },
      { onEvent: vi.fn() },
    );

    expect(consoleLog).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test apps/web/tests/chat/stream-chat.test.ts
```

Expected: FAIL，`console.log` 被当前 chunk 调试输出调用。

- [ ] **Step 3: 最小实现，删除 chunk 级 console.log**

修改 `apps/web/lib/api/chat.ts`，删除这一行：

```typescript
    console.log('Received chunk:', buffer);
```

其余 SSE 解析逻辑保持不变。

- [ ] **Step 4: 运行前端聊天流测试**

Run:

```bash
pnpm --filter web test apps/web/tests/chat/stream-chat.test.ts
```

Expected: PASS。

- [ ] **Step 5: 运行前端类型检查**

Run:

```bash
pnpm lint:web
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add apps/web/lib/api/chat.ts apps/web/tests/chat/stream-chat.test.ts
git commit -m "fix(logging): 移除前端流式 chunk 调试输出"
```

## Task 4: 回归验证关键链路

**Files:**
- No code changes expected.

- [ ] **Step 1: 运行后端聊天相关测试**

Run:

```bash
pnpm --filter backend test apps/backend/tests/chat/chat.routes.test.ts apps/backend/tests/chat/agent-runtime.test.ts
```

Expected: PASS。

- [ ] **Step 2: 运行全部后端测试**

Run:

```bash
pnpm test:backend
```

Expected: PASS。

- [ ] **Step 3: 运行全部前端测试**

Run:

```bash
pnpm test:web
```

Expected: PASS。

- [ ] **Step 4: 运行全量类型检查**

Run:

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 5: 最终状态检查**

Run:

```bash
git status --short
```

Expected: 没有未提交的代码改动；如果有测试产物或无关改动，不要提交，先确认来源。

## Self-Review

- Spec coverage: 计划覆盖后端启动和业务日志保留、Prisma query 明细降噪、Fastify 自动请求日志降噪、前端 chunk 调试输出移除、错误日志保留和回归验证。
- 完整性扫描：未留下未决要求或延后实现说明。
- Type consistency: 使用现有 `buildApp`、`setupPrismaLogging`、`streamChat`、Vitest `vi` API；不新增未定义类型或函数。
