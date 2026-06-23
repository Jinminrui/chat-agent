# Chat Agent

前后端分离的网页聊天 agent，支持账号密码登录、历史会话、SSE 流式聊天、内置工具调用。

## 技术栈

- **前端**: Next.js 15 + React 19
- **后端**: Fastify 5 + TypeScript
- **数据库**: PostgreSQL + Prisma
- **测试**: Vitest + Testing Library

## 项目结构

```text
apps/
  backend/    — Fastify 后端（认证、会话、聊天、agent runtime）
  web/        — Next.js 前端（登录、注册、聊天界面）
packages/
  shared/     — 共享类型定义（contracts、events）
prisma/       — 数据库 schema 与迁移
```

## 前置条件

- Node.js >= 18
- pnpm >= 10
- PostgreSQL 数据库

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL 和 SESSION_SECRET

# 数据库迁移
pnpm --filter backend exec prisma migrate dev

# 启动后端
pnpm dev:backend

# 启动前端（新终端）
pnpm dev:web
```

访问 http://localhost:3000 即可使用。

## 测试

```bash
# 运行所有测试
pnpm test

# 仅运行后端测试
pnpm --filter backend test

# 仅运行前端测试
pnpm --filter web test
```

## 核心功能

- 账号密码注册、登录、登出
- 个人会话列表与消息历史
- SSE 流式聊天回复
- 内置工具注册与最小 agent runtime（web_search、fetch_url、current_time）
- 前后端共享类型契约

## API 接口

### 认证

- `POST /auth/register` — 注册
- `POST /auth/login` — 登录
- `POST /auth/logout` — 登出
- `GET /auth/me` — 当前用户信息

### 会话

- `GET /conversations` — 会话列表
- `POST /conversations` — 创建会话
- `GET /conversations/:id/messages` — 会话消息历史

### 聊天

- `POST /chat/stream` — SSE 流式聊天
