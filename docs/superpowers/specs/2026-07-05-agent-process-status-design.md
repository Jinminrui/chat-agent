# Agent 过程状态前台展示设计

**日期：** 2026-07-05
**状态：** 已批准
**作者：** AI Assistant

## 1. 背景

当前后端聊天流已经通过 SSE 发送 `delta`、`tool.start`、`tool.end`、`done`、`error` 等事件，前端共享类型也已经声明这些事件。但 `useChatStream` 目前只处理 `delta` 和 `error`，导致用户在前台只能看到最终流式回答，看不到 Agent 正在思考、调用工具或生成回答的过程状态。

本次优化目标是让用户在发送消息后看到可理解的过程状态，同时保持界面克制，不展示模型隐藏推理链，也不展示工具输入输出。

## 2. 目标

- 用户发送消息后，当前流式助手消息上方显示状态型过程提示。
- 展示状态包括：正在思考、正在调用工具、工具调用完成、正在生成回答。
- 工具调用状态只展示工具名和状态，不展示工具输入、输出。
- 状态随 SSE 事件更新，流结束后消失，只保留最终助手回答正文。
- 不改变后端 SSE 协议，不改变消息持久化格式。

## 3. 非目标

- 不展示模型隐藏推理链或详细推理步骤。
- 不新增完整过程时间线。
- 不保存过程状态到数据库。
- 不展示工具输入、工具输出或原始 SSE 数据。
- 不重做聊天消息布局。

## 4. 交互设计

过程状态显示在当前流式助手消息上方，复用现有 `MessageRow` 的 `toolStatus` 展示入口。

状态文案：

- 初始发送后：`正在思考...`
- 收到 `tool.start`：`正在调用 <toolName>...`
- 收到 `tool.end`：`<toolName> 调用完成`
- 收到第一个 `delta`：`正在生成回答...`
- 收到 `error`：通过现有错误状态展示失败，不保留过程状态
- 收到 `done` 或流结束：清空过程状态

如果一次回答调用多个工具，状态条只展示最新事件对应的工具状态，不保留完整历史。

## 5. 数据流

### 5.1 后端

后端保持现有 SSE 事件不变：

- `tool.start` 包含 `toolName` 和 `input`
- `tool.end` 包含 `toolName` 和 `output`
- `delta` 包含回答增量
- `done` 表示回答完成
- `error` 表示失败

前端只使用 `toolName` 和事件类型，忽略 `input` 与 `output`。

### 5.2 前端状态

`useChatStream` 新增一个过程状态对象：

```ts
type ProcessStatus = {
  toolName?: string;
  status: "running" | "success" | "error";
  label: string;
};
```

状态更新规则：

- `send()` 开始时设置状态为思考中。
- `tool.start` 设置为 running。
- `tool.end` 设置为 success。
- 第一个 `delta` 设置为生成回答中。
- `error` 和 `onComplete` 清空状态。

### 5.3 页面传递

`ConversationPage` 从 `useChatStream` 读取 `processStatus`，传给 `MessageList`。

`MessageList` 只把状态传给当前流式助手消息。已有历史消息不显示过程状态。

`MessageRow` 继续负责渲染状态 badge，不新增独立过程消息。实现时将现有 `toolStatus` 属性重命名为 `processStatus`，因为该状态不只表示工具调用，也表示思考中和生成回答中。

## 6. 错误处理

如果流式请求失败，`useChatStream` 继续设置现有 `error` 状态，并清空过程状态。前台不展示过期的“正在调用工具”或“正在生成回答”。

如果收到未知事件，保持现有忽略策略，不新增用户可见错误。

## 7. 测试策略

- `useChatStream` 测试覆盖：
  - 发送后出现“正在思考”状态。
  - `tool.start` 后显示工具调用中。
  - `tool.end` 后显示工具调用完成。
  - 第一个 `delta` 后显示正在生成回答。
  - 完成或失败后清空过程状态。
- `ConversationPage` 或 `MessageList` 测试覆盖：
  - 当前流式助手消息接收并展示状态。
  - 历史助手消息不展示过程状态。
- `MessageRow` 测试覆盖：
  - running 状态显示加载图标和文案。
  - success 状态显示完成文案。

## 8. 成功标准

- 用户发送消息后，可以在当前助手回复位置看到过程状态。
- 工具调用过程中能看到具体工具名。
- 回答完成后，聊天记录只保留最终助手回答正文。
- 前台不展示隐藏推理、工具输入或工具输出。
- 现有聊天流、消息渲染和测试继续通过。
