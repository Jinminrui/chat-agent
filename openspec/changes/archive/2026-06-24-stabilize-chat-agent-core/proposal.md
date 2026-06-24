## Why

当前项目已经具备聊天、认证、会话、SSE 与工具调用的基础骨架，但核心链路存在多处断裂：聊天上下文与工具调用未真正闭环，前后端共享契约与测试已经漂移，部分用户入口与工程脚本对外宣称可用但实际不可依赖。现在需要先把这些基础问题收敛并修复，否则后续功能迭代会建立在不稳定前提上。

## What Changes

- 修复聊天主链路，确保多轮上下文、工具调用、checkpoint 恢复与 SSE 错误返回行为一致且可验证。
- 统一前后端 API、SSE 事件、共享类型与错误响应契约，清理实现与测试之间的漂移。
- 修正认证与会话产品流，包括注册后的会话状态、聊天页访问前提、退出登录入口与错误体验。
- 提升会话可用性，修复会话列表、标题与历史展示中影响基本使用的问题。
- 补齐当前仓库最低限度的工程可信度，包括可运行的校验脚本、测试入口与与实际实现一致的项目文档。

## Capabilities

### New Capabilities

- `chat-runtime-reliability`: 定义聊天执行链路在上下文加载、工具调用、checkpoint 恢复与 SSE 异常处理上的必备行为。
- `api-contract-consistency`: 定义前后端 API、错误响应、SSE 事件与共享类型必须保持一致的契约要求。
- `auth-session-flow`: 定义注册、登录、登出、会话恢复与受保护页面访问的用户流要求。
- `conversation-usability`: 定义会话列表、标题、历史消息展示与新建会话后的基本可用性要求。
- `developer-quality-gates`: 定义仓库脚本、测试入口与项目文档的最低可运行标准。

### Modified Capabilities

- 无

## Impact

- 后端：`apps/backend/src/modules/chat`、`apps/backend/src/modules/providers`、`apps/backend/src/modules/auth`、`apps/backend/src/modules/conversations`、`apps/backend/src/lib`、`apps/backend/src/plugins`
- 前端：`apps/web/app/chat`、`apps/web/components/chat`、`apps/web/components/auth`、`apps/web/lib/api`、`apps/web/features/chat`、`apps/web/types`
- 共享契约：`packages/shared/src`
- 测试：`apps/backend/tests`、`apps/web/tests`、根级 Vitest 配置
- 工程文档与脚本：`README.md`、根级与子应用 `package.json`
