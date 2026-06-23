# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

前后端分离的网页聊天 agent，支持账号密码登录、历史会话、SSE 流式聊天、内置工具调用（web_search、fetch_url、current_time）。

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动开发（需分别在两个终端运行）
pnpm dev:backend    # Fastify 后端，默认 :3001
pnpm dev:web        # Next.js 前端，默认 :3000

# 测试
pnpm test                          # 全部测试
pnpm --filter backend test         # 后端测试（vitest run --root ../..）
pnpm --filter web test             # 前端测试（vitest run，jsdom 环境）

# 数据库迁移（prisma schema 在 prisma/schema.prisma）
pnpm --filter backend exec prisma migrate dev
```

## 架构

**pnpm monorepo**：`apps/backend`、`apps/web`、`packages/shared`。

### 后端 (`apps/backend`)

- **框架**: Fastify 5，入口 `src/server.ts` → `src/app.ts`
- **模块目录**: `src/modules/{auth,chat,conversations,providers,tools}/`
- **插件**: `src/plugins/` — auth-session（cookie session）、response-format（统一响应格式）
- **响应格式**: 统一为 `{ code: number, msg: string, data: T }`，code=0 表示成功（见 `src/lib/response.ts`）
- **SSE 流式**: `SSEWriter` 类（`src/lib/sse.ts`）直接写 `reply.raw`，事件类型见 `packages/shared/src/events.ts`
- **Agent Runtime**: `src/modules/chat/agent-runtime.ts` — provider 循环 + tool registry，支持 checkpoint 恢复和 maxToolCalls 限制
- **Tool 注册**: `src/modules/tools/tool-registry.ts`，内置工具在 `builtins/` 目录
- **认证**: `@fastify/session` + `@fastify/cookie`，session-based，cookie name 为 `session`
- **日志**: Pino（生产 JSON，开发 pino-pretty），通过 `x-request-id` 头追踪请求
- **依赖注入**: provider 和 tools 通过 `buildApp()` options 传入，方便测试 mock

### 前端 (`apps/web`)

- **框架**: Next.js 15 (App Router)，React 19
- **路由**: `app/` 目录 — login、register、chat、chat/[conversationId]
- **UI**: shadcn 组件在 `components/ui/`，业务组件在 `components/auth/` 和 `components/chat/`
- **API 客户端**: `lib/api/client.ts` — 统一 `api.get/post/put/delete`，自动解析 ApiResponse，错误抛 ApiError
- **SSE 消费**: `lib/api/chat.ts` 中 `streamChat()` 手动解析 SSE 文本协议，`features/chat/use-chat-stream.ts` 封装为 React hook
- **别名**: `@` 映射到 apps/web 根目录

### 共享包 (`packages/shared`)

- 导出 `contracts.ts`（类型定义）和 `events.ts`（SSE 事件类型）
- 前后端通过 `@chat-agent/shared` 引用，保证类型一致
- 前端通过 vite alias 直接引用源码（非编译产物）

### 数据库 (Prisma)

- Schema 在 `prisma/schema.prisma`，模型：User、Conversation、Message、ToolCall、Checkpoint
- 所有模型使用 `cuid()` 作为 ID
- Conversation 与 Message/ToolCall/Checkpoint 为级联删除

## 环境变量

参见 `.env.example`，关键变量：
- `DATABASE_URL` — PostgreSQL 连接串
- `SESSION_SECRET` — session 加密密钥（至少 32 字符）
- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` — LLM 配置
- `WEB_ORIGIN` — CORS 允许的前端地址
- `NEXT_PUBLIC_API_BASE_URL` — 前端调用后端的地址

## 测试

- 后端和 shared 测试配置在根目录 `vitest.config.ts`，路径为 `apps/backend/tests/` 和 `packages/shared/tests/`
- 前端测试配置在 `apps/web/vitest.config.ts`，使用 jsdom 环境，setup 文件引入 `@testing-library/jest-dom/vitest`
- 前端测试中 `@chat-agent/shared` 通过 vite alias 直接指向源码
