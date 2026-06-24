## Why

当前聊天界面对 assistant 输出仅按纯文本显示，无法将标题、列表、代码块、链接等 Markdown 结构转化为可读的富文本内容。这会削弱 Agent 在解释步骤、展示示例代码和组织长答案时的可读性，因此需要尽快统一为 Markdown 渲染体验。

## What Changes

- 将 assistant 消息从纯文本展示调整为 Markdown 渲染，提升历史消息与新回复的可读性。
- 将流式回复阶段的临时展示与最终落库后的消息展示对齐，避免同一条 assistant 消息在“生成中”和“生成后”呈现两套样式。
- 明确用户消息仍保持纯文本展示，不引入输入侧富文本编辑能力。
- 明确默认不启用原始 HTML 渲染，限制渲染范围在安全可控的 Markdown 子集。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `conversation-usability`: 会话消息展示需要支持 assistant Markdown 渲染，并保证历史消息与流式消息的一致呈现。

## Impact

- 前端展示层：`apps/web/components/chat/message-row.tsx`、`apps/web/components/chat/message-list.tsx`、`apps/web/app/chat/[conversationId]/page.tsx`
- 前端聊天流处理：`apps/web/features/chat/use-chat-stream.ts`
- 前端依赖与样式：可能需要新增 Markdown 渲染依赖和对应样式约束
- 测试：聊天消息渲染、流式回复展示、响应式布局相关前端测试需要补充或调整
