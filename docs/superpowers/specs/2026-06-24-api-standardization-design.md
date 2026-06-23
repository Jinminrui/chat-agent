# API 接口规范化设计文档

## 1. 概述

本文档描述了 chat-agent 项目后端接口的规范化设计，包括统一响应格式、业务状态码体系、SSE 流式响应规范等。

## 2. 设计目标

- 统一所有普通接口的响应格式为 `{code, msg, data}`
- 使用模块化的业务状态码体系
- SSE 流式响应符合 W3C 标准和业内最佳实践
- 支持断线重连和心跳机制

## 3. 统一响应格式

### 3.1 成功响应

```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    // 业务数据
  }
}
```

### 3.2 错误响应

```json
{
  "code": 1001,
  "msg": "参数错误：邮箱格式不正确",
  "data": null
}
```

### 3.3 HTTP 状态码映射

| 业务状态码范围 | HTTP 状态码 | 说明 |
|---------------|-------------|------|
| 0 | 200 / 201 | 成功 |
| 1xxx | 400 | 参数错误 |
| 2xxx | 401 | 认证错误 |
| 3xxx | 403 / 404 | 权限/资源错误 |
| 4xxx | 409 | 业务冲突 |
| 5xxx | 500 | 系统错误 |

## 4. 业务状态码体系

### 4.1 通用状态码

| code | 说明 | HTTP 状态码 |
|------|------|-------------|
| 0 | 成功 | 200 / 201 |
| 1000 | 未知参数错误 | 400 |
| 1001 | 参数缺失 | 400 |
| 1002 | 参数格式错误 | 400 |
| 1003 | 参数值无效 | 400 |
| 2000 | 未知认证错误 | 401 |
| 2001 | 未登录 | 401 |
| 2002 | 登录凭证无效 | 401 |
| 2003 | 登录已过期 | 401 |
| 5000 | 未知系统错误 | 500 |
| 5001 | 数据库错误 | 500 |
| 5002 | 外部服务错误 | 500 |

### 4.2 Auth 模块状态码 (101x-102x)

| code | 说明 | HTTP 状态码 |
|------|------|-------------|
| 1010 | 邮箱已存在 | 409 |
| 1011 | 用户名已存在 | 409 |
| 1012 | 密码强度不足 | 400 |
| 1013 | 邮箱格式不正确 | 400 |
| 1014 | 用户名格式不正确 | 400 |
| 1020 | 登录失败：凭证错误 | 401 |
| 1021 | 登录失败：账号被锁定 | 403 |

### 4.3 Chat 模块状态码 (201x-202x)

| code | 说明 | HTTP 状态码 |
|------|------|-------------|
| 2010 | 会话不存在 | 404 |
| 2011 | 会话不属于当前用户 | 403 |
| 2012 | 消息内容为空 | 400 |
| 2013 | 消息长度超限 | 400 |
| 2020 | 工具调用失败 | 500 |
| 2021 | 工具不存在 | 404 |
| 2022 | 工具调用次数超限 | 429 |

### 4.4 Conversation 模块状态码 (301x-302x)

| code | 说明 | HTTP 状态码 |
|------|------|-------------|
| 3010 | 会话不存在 | 404 |
| 3011 | 会话不属于当前用户 | 403 |
| 3012 | 会话标题无效 | 400 |

## 5. SSE 流式响应规范

### 5.1 响应头

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 5.2 事件格式

#### 5.2.1 文本增量事件

```
event: delta
id: 1
data: {"content": "你"}
```

#### 5.2.2 工具调用开始事件

```
event: tool.start
id: 2
data: {"toolName": "web-search", "input": {"query": "天气"}}
```

#### 5.2.3 工具调用完成事件

```
event: tool.end
id: 3
data: {"toolName": "web-search", "output": {"result": "晴天"}}
```

#### 5.2.4 流式结束事件

```
event: done
id: 4
data: {"messageId": "msg_123", "totalTokens": 150}
```

#### 5.2.5 错误事件

```
event: error
id: 5
data: {"code": 2005, "msg": "工具调用失败", "toolName": "web-search"}
```

#### 5.2.6 心跳事件

```
event: heartbeat
id: 6
data: {"timestamp": 1687123456789}
```

### 5.3 断线重连

- 每个事件都包含 `id` 字段，用于断线重连
- 客户端使用 `Last-Event-ID` 请求头重连
- 服务端根据 `id` 恢复事件流

### 5.4 心跳机制

- 每 30 秒发送一次心跳事件
- 防止代理服务器超时断开连接
- 心跳事件不包含业务数据

## 6. 实现方案

### 6.1 创建统一响应工具函数

```typescript
// src/lib/response.ts

export function success<T>(data: T, msg = 'ok') {
  return { code: 0, msg, data };
}

export function error(code: number, msg: string, data = null) {
  return { code, msg, data };
}
```

### 6.2 创建业务状态码常量

```typescript
// src/lib/error-codes.ts

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
```

### 6.3 创建 Fastify 插件

```typescript
// src/plugins/response-format.ts

import fp from 'fastify-plugin';
import { success, error } from '../lib/response';

// 类型声明
declare module 'fastify' {
  interface FastifyReply {
    success<T>(data: T, msg?: string): FastifyReply;
    error(code: number, msg: string): FastifyReply;
  }
}

export default fp(async (app) => {
  // 装饰 reply 对象
  app.decorateReply('success', function (data: unknown, msg = 'ok') {
    return this.send(success(data, msg));
  });
  
  app.decorateReply('error', function (code: number, msg: string) {
    return this.send(error(code, msg));
  });
});
```

### 6.4 创建 SSE 工具函数

```typescript
// src/lib/sse.ts

export class SSEWriter {
  private id = 0;
  
  constructor(private reply: FastifyReply) {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
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
  }
  
  error(code: number, msg: string, details?: unknown) {
    this.write('error', { code, msg, ...details });
  }
  
  heartbeat() {
    this.write('heartbeat', { timestamp: Date.now() });
  }
}
```

### 6.5 修改路由文件

以 `auth.routes.ts` 为例：

```typescript
// 修改前
return reply.code(201).send({ user });

// 修改后
return reply.code(201).success({ user });
```

```typescript
// 修改前
return reply.code(401).send({ message: "Unauthorized" });

// 修改后
return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
```

### 6.6 前端类型封装

#### 6.6.1 统一响应类型

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

#### 6.6.2 业务类型定义

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

#### 6.6.3 API 客户端封装

```typescript
// apps/web/lib/api.ts

import { type ApiResponse, isSuccess } from '@/types/api';

const BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
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

#### 6.6.4 使用示例

```typescript
// apps/web/features/auth/api.ts

import { api } from '@/lib/api';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@/types/auth';

export const authApi = {
  login(data: LoginRequest) {
    return api.post<LoginResponse>('/auth/login', data);
  },
  
  register(data: RegisterRequest) {
    return api.post<RegisterResponse>('/auth/register', data);
  },
  
  logout() {
    return api.post<void>('/auth/logout');
  },
  
  getMe() {
    return api.get<{ user: User }>('/auth/me');
  },
};
```

```typescript
// apps/web/features/auth/hooks.ts

import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from './api';
import { ApiError } from '@/lib/api';

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onError: (error: ApiError) => {
      console.error('登录失败:', error.msg);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getMe(),
    retry: false,
  });
}
```

## 7. 测试策略

### 7.1 单元测试

- 测试 `success()` 和 `error()` 函数
- 测试业务状态码常量
- 测试 SSE 工具函数

### 7.2 集成测试

- 测试普通接口的响应格式
- 测试 SSE 接口的事件格式
- 测试断线重连机制
- 测试心跳机制

## 8. 迁移计划

### 8.1 阶段 1：基础设施

1. 创建 `response.ts` 和 `error-codes.ts`
2. 创建 `response-format.ts` 插件
3. 创建 `sse.ts` 工具函数
4. 编写单元测试

### 8.2 阶段 2：普通接口迁移

1. 修改 `auth.routes.ts`
2. 修改 `conversation.routes.ts`
3. 修改 `chat.routes.ts` 的非流式接口
4. 更新 JSON Schema 定义
5. 编写集成测试

### 8.3 阶段 3：SSE 接口迁移

1. 修改 `chat.routes.ts` 的流式接口
2. 实现断线重连机制
3. 实现心跳机制
4. 编写集成测试

### 8.4 阶段 4：前端适配

1. 更新前端 API 调用代码
2. 更新前端 SSE 处理代码
3. 测试端到端功能

## 9. 注意事项

### 9.1 向后兼容

- 考虑是否需要支持旧版本接口
- 可以通过版本号（如 `/api/v1`）实现版本管理

### 9.2 性能考虑

- SSE 心跳间隔不宜过短，建议 30 秒
- 断线重连时，需要考虑消息丢失的可能性
- 大量并发 SSE 连接时，需要考虑服务器资源

### 9.3 安全性

- SSE 连接需要验证用户身份
- 防止 SSE 注入攻击
- 限制 SSE 连接的持续时间

## 10. 参考资料

- [W3C Server-Sent Events 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [OpenAI API 流式响应规范](https://platform.openai.com/docs/api-reference/chat/create)
- [Fastify 插件开发文档](https://www.fastify.io/docs/latest/Reference/Plugins/)
