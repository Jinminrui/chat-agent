# 后端日志系统设计

**日期：** 2026-06-23  
**状态：** 已批准  
**作者：** AI Assistant

---

## 1. 目标

为 chat-agent 后端构建统一的日志系统，同时服务开发和生产环境。

**核心需求：**
- 开发环境：便于调试，追踪请求流程
- 生产环境：监控错误、性能指标、异常排查

**技术选型：** 基于 Fastify 内置的 Pino 日志库

---

## 2. 日志级别

采用最简三级体系：

| 级别 | 用途 | 对应 Pino 级别 |
|------|------|----------------|
| `error` | 错误，需要立即关注 | `error` (50) |
| `warn` | 警告，潜在问题 | `warn` (40) |
| `log` | 一般信息 | `info` (30) |

**级别控制：**
- 开发环境：默认 `log`（显示所有）
- 生产环境：默认 `warn`（只显示警告和错误）
- 通过 `LOG_LEVEL` 环境变量覆盖

---

## 3. 输出格式

### 3.1 JSON 格式（生产环境）

```json
{
  "level": 30,
  "time": 1719100000000,
  "requestId": "req_550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_123",
  "method": "POST",
  "url": "/chat/stream",
  "msg": "request completed"
}
```

### 3.2 文本格式（开发环境）

通过 `pino-pretty` 美化输出：

```
[17:30:45.123] INFO (req_550e8400): request completed
    method: "POST"
    url: "/chat/stream"
    statusCode: 200
    responseTime: 1234
```

**实现方式：**
```bash
# package.json
"dev": "tsx watch src/server.ts | pino-pretty"
```

---

## 4. 请求 ID 追踪

每个请求生成唯一 ID，贯穿整个请求生命周期。

### 4.1 ID 生成规则

- 格式：`req_<uuid>`
- 来源优先级：
  1. 客户端传入的 `X-Request-Id` 请求头
  2. 自动生成 UUID

### 4.2 日志上下文

```typescript
interface LogContext {
  requestId: string;      // 请求唯一标识
  userId?: string;        // 当前用户 ID（已登录时）
  method?: string;        // HTTP 方法
  path?: string;          // 请求路径
}
```

### 4.3 使用方式

```typescript
// 路由处理器中（自动关联请求上下文）
request.log.log({ userId }, '用户登录成功');

// 服务层中（手动传入上下文）
app.log.warn({ requestId, toolName }, '工具调用超时');
```

---

## 5. HTTP 请求日志

自动记录所有 HTTP 请求和响应。

### 5.1 记录内容

```json
{
  "level": 30,
  "requestId": "req_550e8400",
  "method": "POST",
  "url": "/chat/stream",
  "statusCode": 200,
  "responseTime": 1234,
  "msg": "request completed"
}
```

### 5.2 配置选项

在 `app.ts` 中配置 Fastify logger：

```typescript
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'log',
    // 生产环境使用 JSON，开发环境通过 pino-pretty 美化
  },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
});
```

**敏感数据处理：**
- 不记录请求体（包含用户消息，可能敏感）
- 不记录响应体（SSE 流，数据量大）
- 忽略健康检查路径 `/health`

### 5.3 错误请求

状态码 >= 400 时，额外记录错误信息：

```json
{
  "level": 50,
  "requestId": "req_550e8400",
  "statusCode": 401,
  "error": "Unauthorized",
  "msg": "request errored"
}
```

---

## 6. 错误日志

### 6.1 全局错误处理器

```typescript
// app.ts
app.setErrorHandler((error, request, reply) => {
  request.log.error({
    err: error,
    statusCode: error.statusCode || 500
  }, error.message);
  
  reply.code(error.statusCode || 500).send({ message: 'Internal Server Error' });
});
```

### 6.2 输出示例

```json
{
  "level": 50,
  "requestId": "req_550e8400",
  "err": {
    "type": "Error",
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ..."
  },
  "msg": "Database connection failed"
}
```

---

## 7. 业务操作日志

在关键业务节点手动记录。

### 7.1 Agent 运行日志

```typescript
// agent-runtime.ts
request.log.log({ 
  conversationId, 
  toolCallCount: toolCalls.length 
}, 'agent run completed');
```

### 7.2 工具调用日志

```typescript
request.log.log({ 
  toolName, 
  input 
}, 'tool called');
```

### 7.3 认证日志

```typescript
// auth.routes.ts
request.log.log({ userId }, 'user logged in');
request.log.log({ userId }, 'user logged out');
```

---

## 8. 依赖调用日志

### 8.1 Prisma 数据库查询日志

记录慢查询，便于性能分析。

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

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

// 慢查询阈值
const SLOW_QUERY_MS = process.env.NODE_ENV === 'production' ? 100 : 0;

// 需要在 app 启动后注入 logger
export function setupPrismaLogging(logger: Logger) {
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

**输出示例：**
```json
{
  "level": 30,
  "type": "db.query",
  "query": "SELECT * FROM \"User\" WHERE id = $1",
  "duration": 45,
  "msg": "database query"
}
```

### 8.2 LLM Provider 调用日志

在 OpenAI provider 中记录请求耗时：

```typescript
// openai.provider.ts
import type { FastifyBaseLogger } from 'fastify';

type OpenAIProviderOptions = {
  logger: FastifyBaseLogger;
};

export function createOpenAIProvider(options: OpenAIProviderOptions) {
  const { logger } = options;
  
  return {
    async stream(input: { messages: RuntimeMessage[] }) {
      const start = Date.now();
      const response = await openai.chat.completions.create(params);
      
      logger.log({
        type: 'llm.request',
        model: params.model,
        duration: Date.now() - start,
      }, 'llm request completed');
      
      return response;
    }
  };
}
```

---

## 9. 文件结构

```
apps/backend/src/
├── lib/
│   ├── logger.ts          # 日志服务配置
│   └── prisma.ts          # Prisma 客户端（含查询日志）
├── plugins/
│   ├── request-id.ts      # 请求 ID 插件
│   └── auth-session.ts    # 认证会话插件
├── modules/
│   ├── auth/
│   │   └── auth.routes.ts # 认证日志
│   ├── chat/
│   │   ├── chat.routes.ts # 聊天日志
│   │   └── agent-runtime.ts # Agent 运行日志
│   └── providers/
│       └── openai.provider.ts # LLM 调用日志
├── app.ts                 # 应用配置（含错误处理）
└── server.ts              # 服务器启动
```

---

## 10. 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LOG_LEVEL` | `log` | 日志级别（error/warn/log） |
| `NODE_ENV` | `development` | 环境类型 |

---

## 11. 依赖项

**新增依赖：**
- 无（Pino 已随 Fastify 内置）

**开发依赖：**
- `pino-pretty` - 开发环境美化输出

---

## 12. 实施步骤

1. **配置 Fastify logger** - 在 `app.ts` 中启用 Pino
2. **创建请求 ID 插件** - 生成和注入请求 ID
3. **配置错误处理器** - 全局错误捕获和记录
4. **添加业务日志** - 在关键节点添加日志调用
5. **配置 Prisma 日志** - 记录数据库查询
6. **添加 LLM 日志** - 记录模型调用
7. **更新 package.json** - 添加 pino-pretty 和 dev 脚本
8. **编写测试** - 验证日志输出格式

---

## 13. 验证标准

- [ ] 开发环境输出人类可读的彩色日志
- [ ] 生产环境输出 JSON 格式日志
- [ ] 每个请求都有唯一 requestId
- [ ] HTTP 请求自动记录方法、路径、状态码、耗时
- [ ] 错误自动记录堆栈信息
- [ ] 业务操作有明确的日志标记
- [ ] 数据库慢查询被记录
- [ ] LLM 调用耗时被记录

---

## 14. 未来扩展

- 文件日志输出（通过 pino transport）
- 日志聚合服务接入（ELK、Datadog）
- 结构化日志查询
- 日志告警规则
