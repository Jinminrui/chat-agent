# Chat Agent 设计文档

## 1. 背景与目标

本项目目标是实现一个前后端分离的网页聊天 agent。

第一版聚焦通用对话，不绑定垂直业务场景，同时保留可扩展的 agent 架构。系统需要支持用户登录、个人会话历史、流式回复，以及少量服务端内置工具调用能力。

本设计优先级如下：

- 第一版可用，能够完整演示核心链路
- 架构不能把后续扩展路线做死
- 避免过度平台化和猜测性设计

## 2. 范围

### 2.1 第一版包含

- 前后端分离架构
- 前端使用 `Next.js/React`
- 后端使用 `Node.js + TypeScript`
- 账号密码注册、登录、退出
- 用户自己的会话列表和消息历史
- 聊天主界面
- assistant 流式回复
- 多轮上下文对话
- 后端 agent runtime
- 少量服务端内置工具
- 模型 provider 抽象层
- 第一版实际接入一个模型 provider
- 消息和工具调用记录持久化

### 2.2 第一版不包含

- 第三方登录
- 文件上传
- 多模态输入输出
- RAG / 知识库
- 本地命令执行
- 文件系统操作
- 长任务队列
- 多用户协作
- 管理后台
- 复杂计费或配额系统
- 高级模型参数面板

## 3. 总体架构

系统拆分为 6 个清晰模块：

### 3.1 Frontend Web

负责：

- 注册页、登录页
- 聊天页
- 会话列表展示与切换
- 流式消息渲染

前端不直接接触模型 provider 和工具实现，只通过后端 API 获取能力。

### 3.2 Auth API

负责：

- 用户注册
- 用户登录
- 用户登出
- 当前登录用户信息查询

该模块为所有受保护接口提供身份基础。

### 3.3 Conversation API

负责：

- 会话创建
- 会话列表读取
- 指定会话消息历史读取
- 会话归属校验

### 3.4 Chat Execution API

负责：

- 接收聊天请求
- 校验身份与会话归属
- 加载消息上下文
- 调用 agent runtime
- 将 assistant 回复流式返回前端
- 在请求结束后完成消息落库

### 3.5 Agent Runtime

负责一次回答过程的编排：

- 接收上下文和用户输入
- 将工具定义提供给模型
- 判断模型是直接回复还是触发工具调用
- 执行服务端工具
- 将工具结果回注到上下文
- 再次调用模型，直到得到最终答复或触达限制

### 3.6 Provider 与 Tool Layer

包含两部分：

- `Model Provider Layer`：统一封装不同模型服务商
- `Tool Layer`：统一注册、校验和执行服务端内置工具

第一版只接入一个 provider，但接口应允许后续添加第二个 provider，而不重写聊天主链路。

## 4. 第一版功能设计

### 4.1 用户能力

用户可以：

- 注册账号
- 登录和退出
- 创建新的会话
- 查看自己的历史会话
- 进入任意历史会话继续对话
- 发送消息并看到 assistant 流式回复

### 4.2 Agent 能力

第一版不是纯聊天壳子，后端需要支持少量服务端内置工具。

建议第一版只实现 `2~3` 个工具：

- `web_search`
- `fetch_url`
- `current_time`

这些工具足以验证 agent 调用链路，但不会把工具系统做重。

### 4.3 多 provider 能力

第一版代码结构支持多个模型 provider，但只实际实现一个 provider。后续新增 provider 时，应复用同一套聊天执行链路。

## 5. 聊天执行流程

一次聊天请求按以下顺序执行：

1. 前端提交 `conversationId` 和 `message`
2. 后端认证用户身份
3. 后端校验会话归属
4. 读取该会话最近消息历史
5. `Chat Execution API` 将上下文交给 `Agent Runtime`
6. `Agent Runtime` 调用模型，并附带工具定义
7. 如果模型直接回复，则将文本流式返回前端
8. 如果模型请求工具调用，则执行对应服务端工具
9. 工具结果作为新的上下文再次发送给模型
10. 得到最终答复后，持久化用户消息、assistant 消息和工具调用记录

### 5.1 第一版执行约束

为保证稳定性，第一版增加以下限制：

- 只支持串行工具调用
- 单次请求工具调用上限为 `3~5` 次
- 工具必须来自后端白名单注册表
- 工具输入必须经过 schema 校验
- 工具失败时不能让整次请求直接崩溃
- 前端只展示 assistant 文本流和必要状态，不展示内部推理链

## 6. 数据模型

第一版只保留 5 类核心数据。

### 6.1 User

字段建议：

- `id`
- `email` 或 `username`
- `passwordHash`
- `createdAt`

### 6.2 Conversation

字段建议：

- `id`
- `userId`
- `title`
- `createdAt`
- `updatedAt`

### 6.3 Message

字段建议：

- `id`
- `conversationId`
- `role`
- `content`
- `createdAt`

第一版只存最终展示消息，不存模型内部思维链。

### 6.4 ToolCall

字段建议：

- `id`
- `conversationId`
- `messageId`
- `toolName`
- `toolInput`
- `toolOutput`
- `status`
- `createdAt`

该表用于审计和排错。

### 6.5 ProviderConfig

第一版可以先做成系统配置，不强制落为用户级数据表。

用于描述：

- 当前默认 provider
- 当前默认模型

## 7. 权限边界

权限策略只保留一条核心规则：

所有 `Conversation`、`Message`、`ToolCall` 的读取和修改，都必须通过当前登录用户的 `userId` 做归属校验。

系统不得直接信任前端传入的 `conversationId`。每次请求都必须重新验证该会话是否属于当前用户。

第一版最重要的安全目标不是复杂权限系统，而是确保用户 A 无法读取或操作用户 B 的会话数据。

## 8. API 设计

### 8.1 认证接口

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### 8.2 会话接口

- `GET /conversations`
- `POST /conversations`
- `GET /conversations/:id/messages`

### 8.3 聊天接口

- `POST /chat/stream`

该接口职责：

- 接收 `conversationId` 和 `message`
- 执行认证和权限校验
- 加载上下文
- 触发 agent runtime
- 将 assistant 输出以流形式返回前端
- 在请求结束后完成消息与工具记录持久化

## 9. 流式方案与前后端交互

第一版推荐采用 `SSE` 风格流式输出，而不是 WebSocket。

原因：

- 更适合单次请求、单次流式响应场景
- 前后端实现和调试成本更低
- 不需要维护复杂长连接状态

前端交互流程建议如下：

1. 用户登录后进入聊天页
2. 左侧展示会话列表，右侧展示当前聊天区
3. 用户发送消息后，前端先本地插入用户消息
4. 前端调用 `/chat/stream`
5. assistant 回复以增量文本方式持续更新
6. 流结束后，同步最终状态
7. 用户切换会话时，重新拉取该会话的消息历史

第一版前端无需复刻 agent 内部复杂状态机，只需稳定展示：

- 用户消息
- assistant 流式文本
- 可选的工具调用中状态提示

## 10. UI/UX 设计补充

### 10.1 整体视觉方向

第一版整体体验参考 `ChatGPT`，但不做机械复刻，而是采用更正式的产品化表达。

视觉基调建议如下：

- 保留双栏聊天结构和低认知负担
- 使用暖灰、石色、石墨色作为主色系
- 靠留白、排版和层级建立品质感，而不是重色块和重边框
- 保持工具感克制，只轻量提示 agent 正在调用工具

目标体验是：像 `ChatGPT` 一样清晰易用，但更像一个完成度高、可信赖的正式产品。

### 10.2 登录页设计

登录页采用居中单卡布局：

- 整页背景为很浅的暖灰渐变
- 中央卡片宽度约 `420px`
- 卡片内依次展示 `logo`、产品名、短说明、账号输入、密码输入、登录按钮、注册入口

交互要求：

- 页面初次进入自动聚焦第一个输入框
- 错误提示紧贴字段下方展示
- 提交中只锁定表单按钮，不做整页遮罩
- 登录成功后进入最近一次会话，若无历史则进入空白新会话

### 10.3 聊天主页设计

聊天主页采用经典双栏结构：

- 左侧为会话管理栏
- 右侧为聊天主区

左侧栏包含：

- 产品标识
- `新建会话` 主按钮
- 历史会话列表
- 用户信息与退出入口

右侧主区包含：

- 当前会话标题与轻量状态栏
- 消息流区域
- 底部固定输入区

整体原则：

- 会话栏承担导航作用，不做复杂系统菜单
- 聊天主区承担主要视觉权重
- 输入区固定在底部，保证连续对话体验

### 10.4 空状态与建议问题

当用户进入空白新会话时，主区展示空状态：

- 一句欢迎语
- 一句简短说明
- `3~4` 个建议问题卡片

建议问题用于帮助用户理解该 agent 的能力，例如：

- 总结网页内容
- 搜索并比较方案
- 询问当前时间

点击建议问题后，优先填入输入框而不是直接发送，给用户保留确认感。

### 10.5 工具状态表达

工具调用状态是本产品相对普通聊天产品的重要差异点，但第一版应保持克制。

建议表现方式：

- 在 assistant 消息附近显示一条轻量状态提示
- 文案形如 `正在搜索网页`、`正在读取页面`、`正在整理结果`
- 使用浅底色胶囊或轻状态条
- 工具完成后自动收起或弱化显示

第一版不展示：

- 工具底层参数
- 原始 JSON
- 调试级执行细节

### 10.6 设计 Token

建议第一版先定义一组最小化视觉 token：

```css
:root {
  --bg-app: #f6f3ee;
  --bg-surface: #fbf9f6;
  --bg-sidebar: #efe9e1;
  --bg-muted: #f3eee7;
  --bg-hover: #e8e1d8;
  --bg-active: #e2dbd1;

  --text-primary: #1f1f1c;
  --text-secondary: #6f6a62;
  --text-tertiary: #938d84;

  --border-default: #ddd6cc;
  --border-strong: #cfc7bc;

  --accent-primary: #355d52;
  --accent-primary-hover: #2c5046;
  --accent-soft: #dde9e4;

  --status-info-bg: #e8f0ed;
  --status-info-text: #355d52;
  --status-error-bg: #f8e7e5;
  --status-error-text: #8a3d34;
}
```

圆角和间距建议统一使用小规模 token，避免视觉规则发散。

## 11. 前端页面与组件结构

### 11.1 路由结构

建议第一版前端路由收敛为：

```text
/
├─ /login
├─ /register
├─ /chat
└─ /chat/:conversationId
```

如使用 `Next.js App Router`，可组织为：

```text
app/
├─ login/page.tsx
├─ register/page.tsx
├─ chat/page.tsx
├─ chat/[conversationId]/page.tsx
└─ layout.tsx
```

第一版不建议提前增加设置页、模型页、资料页等扩展路由。

### 11.2 页面级组件树

登录页建议结构：

```text
LoginPage
- AuthShell
  - AuthBackground
  - AuthCard
    - BrandBlock
    - LoginForm
      - FormField(usernameOrEmail)
      - FormField(password)
      - FormError
      - SubmitButton
    - AuthSwitchLink
```

聊天页建议结构：

```text
ChatPage
- ChatShell
  - Sidebar
    - SidebarHeader
      - Brand
      - NewConversationButton
    - ConversationSection
      - ConversationList
        - ConversationItem[]
    - SidebarFooter
      - UserMenu
  - MainPanel
    - ChatTopBar
      - ConversationTitle
      - ModelBadge
    - ChatBody
      - EmptyState | MessageViewport
        - MessageList
          - MessageRow[]
            - UserMessageBubble | AssistantMessageBlock
              - ToolStatusInline?
              - MessageContent
    - ComposerArea
      - ToolStatusBar
      - Composer
        - ComposerTextarea
        - SendButton
```

### 11.3 组件职责边界

建议遵守以下边界：

- `Sidebar` 负责会话导航，不直接处理聊天执行
- `MessageList` 负责消息渲染，不持有发送逻辑
- `Composer` 负责输入与提交，不持有完整消息状态
- `ChatPage` 负责聚合当前用户、会话、消息、流式状态等页面级数据

这样可以保持页面数据集中，避免消息状态散落在多个局部组件中。

### 11.4 响应式策略

建议采用桌面优先：

- `>= 1024px`：标准双栏布局
- `768px - 1023px`：侧栏可折叠
- `< 768px`：侧栏改抽屉，默认聚焦聊天主区

## 12. 前端类型与请求层设计

### 12.1 前端核心类型

建议前端至少定义以下核心类型：

- `User`
- `Conversation`
- `Message`
- `ToolCall`
- `ChatStreamRequest`
- `ChatStreamEvent`

消息流式状态建议与持久化消息区分，单独定义前端本地流式消息类型，避免把数据库实体和界面临时状态混在一起。

### 12.2 SSE 事件约定

建议将流式事件收敛为最小集合：

```ts
type ChatStreamEvent =
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

这样前端可以分别处理：

- assistant 增量文本
- 工具状态提示
- 流结束收口
- 流式错误展示

### 12.3 请求层结构

建议请求层组织为：

```text
src/lib/api/
├─ client.ts
├─ auth.ts
├─ conversations.ts
└─ chat.ts
```

职责建议：

- `client.ts`：统一 `fetch` 封装、认证凭证、错误处理
- `auth.ts`：认证接口
- `conversations.ts`：会话和消息接口
- `chat.ts`：聊天流式请求与 SSE 解析

### 12.4 认证建议

如果部署环境允许，第一版优先考虑：

- 后端使用 `httpOnly cookie`
- 前端请求默认带 `credentials: "include"`

这样可以降低前端 token 管理复杂度，并减少敏感凭证暴露风险。

### 12.5 页面侧状态组织

建议页面级状态集中在聊天页容器管理：

- 当前用户
- 当前会话 ID
- 会话列表
- 当前消息列表
- 当前流式回复状态
- 当前工具状态提示
- 加载与错误状态

局部组件只管理局部交互状态，例如输入框内容、输入高度和局部校验提示。

## 13. 测试策略

### 13.1 后端单元测试

覆盖：

- 认证逻辑
- 会话归属校验
- 工具注册与 schema 校验
- agent runtime 的工具调用上限
- agent runtime 的工具失败处理
- provider 适配层统一接口

### 13.2 后端集成测试

覆盖：

- 注册、登录、获取当前用户
- 创建会话、读取自己的历史消息
- `/chat/stream` 完成一次完整聊天闭环
- 模型触发工具调用后生成最终答复
- 用户无法访问其他用户会话

### 13.3 前端基础交互测试

覆盖：

- 登录后进入聊天页
- 会话列表加载与切换
- 发送消息后流式内容逐步出现
- 刷新后历史会话仍可恢复

## 14. 主要风险与应对

### 14.1 流式链路复杂

风险：前后端分离后，流式输出、中断处理和状态同步容易出现边角问题。

应对：第一版采用 SSE 风格协议，减少连接管理复杂度。

### 14.2 Agent Runtime 失控

风险：工具调用无限循环、上下文膨胀或错误传播导致不稳定。

应对：限制工具调用次数，工具执行统一校验，失败走可控分支。

### 14.3 Provider 抽象过度

风险：为了未来支持多 provider，当前写出大量空泛抽象。

应对：只抽象共同最小接口，第一版以单 provider 真实落地为准。

### 14.4 权限校验遗漏

风险：用户越权访问他人会话数据。

应对：所有会话和消息查询都必须经过 `userId` 归属校验。

## 15. 第一版成功标准

满足以下条件即认为第一版目标达成：

- 用户可以注册、登录、退出
- 每个用户只能访问自己的会话和消息
- 用户可以创建会话并进行多轮聊天
- assistant 支持流式回复
- 至少有 `2~3` 个内置工具可以被模型调用
- 后端保留消息记录和工具调用记录
- 新增第二个模型 provider 时，不需要重写聊天主链路

## 16. 结论

第一版应实现为一个前后端分离的网页聊天 agent：

- 前端负责聊天体验与会话展示
- 后端负责认证、会话、agent 编排、模型接入和工具执行
- 架构上为多 provider 和多工具扩展留出边界
- 范围上严格收敛，优先保证登录、历史会话、流式对话和内置工具链路跑通

这条路线兼顾了可演示性和可扩展性，适合作为后续实现计划的基础。
