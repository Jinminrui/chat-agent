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
# 编辑 .env，至少填入 DATABASE_URL、SESSION_SECRET、NEXT_PUBLIC_API_BASE_URL

# 数据库迁移
pnpm --filter backend exec prisma migrate dev

# 启动后端
pnpm dev:backend

# 启动前端（新终端）
pnpm dev:web
```

默认访问：

- 前端: http://localhost:3000
- 后端: http://localhost:3001

如果未配置 `LLM_API_KEY`，后端会启用本地 mock provider，仍可验证基础聊天和工具调用链路。

## 测试

```bash
# 根级验证入口
pnpm lint
pnpm test

# 分应用验证
pnpm lint:backend
pnpm lint:web
pnpm test:shared
pnpm test:backend
pnpm test:web
```

## 核心功能

- 账号密码注册、登录、登出
- 个人会话列表与消息历史
- SSE 流式聊天回复
- 内置工具注册与最小 agent runtime（`web-search`、`fetch-url`、`current-time`）
- 前后端共享类型契约
- 统一日志系统（请求追踪、错误记录、业务操作日志）

## 日志系统

后端使用 Pino 作为日志库，支持以下特性：

- **请求追踪**：每个请求自动生成唯一 requestId
- **日志级别**：error, warn, info
- **输出格式**：JSON（生产环境）、美化文本（开发环境）

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | - | PostgreSQL 连接串 |
| `SESSION_SECRET` | `dev-session-secret-with-32-characters` | Session 密钥，生产环境必须覆盖 |
| `PORT` | `3001` | 后端监听端口 |
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `WEB_ORIGIN` | `http://localhost:3000` | 允许的前端来源，支持逗号分隔 |
| `LOG_LEVEL` | `info` | 日志级别（error/warn/info） |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI 兼容接口地址 |
| `LLM_API_KEY` | - | 模型调用密钥；未设置时走 mock provider |
| `LLM_MODEL` | `gpt-3.5-turbo` | 默认模型名 |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | 前端请求后端的基础地址 |

### 开发环境

```bash
pnpm dev:backend  # 自动使用 pino-pretty 美化输出
```

### 生产环境

```bash
LOG_LEVEL=warn pnpm start  # JSON 格式输出
```

## API 接口

### 认证

- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录
- `POST /api/auth/logout` — 登出
- `GET /api/auth/me` — 当前用户信息

### 会话

- `GET /api/conversations` — 会话列表
- `POST /api/conversations` — 创建会话
- `GET /api/conversations/:id/messages` — 会话消息历史

### 聊天

- `POST /api/chat/stream` — SSE 流式聊天
