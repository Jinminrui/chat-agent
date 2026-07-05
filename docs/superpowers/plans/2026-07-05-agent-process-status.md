# Agent 过程状态前台展示实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在前台聊天流中展示 Agent 的状态型过程提示，包括思考中、工具调用中、工具完成和生成回答中。

**Architecture:** 复用现有 SSE 事件和现有 `MessageRow` 状态 badge 入口，不改后端协议和数据库。`useChatStream` 负责把 `tool.start`、`tool.end`、`delta`、`error`、完成回调转换为 `processStatus`；`ConversationPage` 把状态传给 `MessageList`；`MessageList` 只把状态传给当前流式助手消息；`MessageRow` 只展示状态文案，不展示工具输入输出或隐藏推理。

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library, SSE

---

## File Structure

- Modify: `apps/web/features/chat/use-chat-stream.ts`  
  负责消费 `streamChat` 事件并维护流式状态。新增 `ProcessStatus` 类型和 `processStatus` state。

- Modify: `apps/web/app/chat/[conversationId]/page.tsx`  
  负责把 `useChatStream` 返回的 `processStatus` 传给 `MessageList`。

- Modify: `apps/web/components/chat/message-list.tsx`  
  负责把过程状态只传给当前流式助手消息。将 props 从 `toolStatus` 调整为 `processStatus`。

- Modify: `apps/web/components/chat/message-row.tsx`  
  负责渲染助手消息和状态 badge。将 props 从 `toolStatus` 调整为 `processStatus`，支持 running 与 success 两种可见状态。

- Modify: `apps/web/tests/chat/use-chat-stream.test.ts`  
  覆盖过程状态随 SSE 事件变化。

- Modify: `apps/web/tests/chat/message-row.test.tsx`  
  覆盖状态 badge 渲染。

- Modify: `apps/web/tests/chat/message-list.test.tsx`  
  覆盖过程状态只出现在当前流式助手消息上。

- Modify: `apps/web/tests/chat/chat-flow.test.tsx`  
  覆盖会话页把流式过程状态展示到页面。

## Task 1: 在 useChatStream 中维护过程状态

**Files:**
- Modify: `apps/web/features/chat/use-chat-stream.ts`
- Modify: `apps/web/tests/chat/use-chat-stream.test.ts`

- [ ] **Step 1: 写失败测试 - send 后显示正在思考**

在 `apps/web/tests/chat/use-chat-stream.test.ts` 中追加测试：

```typescript
  it("sets process status to thinking when send starts", async () => {
    mockStreamChat.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChatStream());

    act(() => {
      result.current.send("conv-1", "Hi");
    });

    expect(result.current.processStatus).toEqual({
      status: "running",
      label: "正在思考...",
    });
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: FAIL，`processStatus` 不存在。

- [ ] **Step 3: 最小实现 - 新增 ProcessStatus 和初始状态**

修改 `apps/web/features/chat/use-chat-stream.ts`：

```typescript
import { useState, useCallback, useRef } from "react";
import type { ChatStreamEvent } from "@chat-agent/shared";
import { streamChat } from "@/lib/api/chat";

export type ProcessStatus = {
  toolName?: string;
  status: "running" | "success" | "error";
  label: string;
};

export function useChatStream(opts?: { onComplete?: (response: string) => void }) {
  const [streaming, setStreaming] = useState(false);
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  const accumulatedRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const send = useCallback(
    async (conversationId: string, message: string) => {
      setStreaming(true);
      setDelta("");
      setError(null);
      setProcessStatus({ status: "running", label: "正在思考..." });
      accumulatedRef.current = "";

      try {
        await streamChat(
          { conversationId, message },
          {
            onEvent(event: ChatStreamEvent) {
              if (event.event === "delta") {
                accumulatedRef.current += event.data.content;
                setDelta(accumulatedRef.current);
              } else if (event.event === "error") {
                throw new Error(event.data.msg);
              }
            },
            onComplete() {
              setProcessStatus(null);
              setStreaming(false);
              optsRef.current?.onComplete?.(accumulatedRef.current);
            },
          },
        );
      } catch (err) {
        setProcessStatus(null);
        setError(err instanceof Error ? err.message : "Unknown error");
        setStreaming(false);
      }
    },
    [],
  );

  return { streaming, delta, error, processStatus, send };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: PASS。

- [ ] **Step 5: 写失败测试 - tool.start 显示工具调用中**

在 `apps/web/tests/chat/use-chat-stream.test.ts` 中追加测试：

```typescript
  it("sets process status when a tool starts", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({
        event: "tool.start",
        id: 1,
        data: { toolName: "web-search", input: { query: "天气" } },
      });
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "查天气");
    });

    expect(result.current.processStatus).toEqual({
      toolName: "web-search",
      status: "running",
      label: "正在调用 web-search...",
    });
  });
```

- [ ] **Step 6: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: FAIL，`tool.start` 仍被忽略。

- [ ] **Step 7: 最小实现 - 处理 tool.start**

在 `onEvent` 中加入分支：

```typescript
              } else if (event.event === "tool.start") {
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "running",
                  label: `正在调用 ${event.data.toolName}...`,
                });
```

完整 `onEvent` 片段应为：

```typescript
            onEvent(event: ChatStreamEvent) {
              if (event.event === "delta") {
                accumulatedRef.current += event.data.content;
                setDelta(accumulatedRef.current);
              } else if (event.event === "tool.start") {
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "running",
                  label: `正在调用 ${event.data.toolName}...`,
                });
              } else if (event.event === "error") {
                throw new Error(event.data.msg);
              }
            },
```

- [ ] **Step 8: 运行测试，确认通过**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: PASS。

- [ ] **Step 9: 写失败测试 - tool.end 显示工具完成**

在 `apps/web/tests/chat/use-chat-stream.test.ts` 中追加测试：

```typescript
  it("sets process status when a tool finishes", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({
        event: "tool.end",
        id: 2,
        data: { toolName: "web-search", output: { results: [] } },
      });
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "查天气");
    });

    expect(result.current.processStatus).toEqual({
      toolName: "web-search",
      status: "success",
      label: "web-search 调用完成",
    });
  });
```

- [ ] **Step 10: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: FAIL，`tool.end` 仍被忽略。

- [ ] **Step 11: 最小实现 - 处理 tool.end**

在 `onEvent` 中加入分支：

```typescript
              } else if (event.event === "tool.end") {
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "success",
                  label: `${event.data.toolName} 调用完成`,
                });
```

- [ ] **Step 12: 写失败测试 - 第一个 delta 显示正在生成回答**

在 `apps/web/tests/chat/use-chat-stream.test.ts` 中追加测试：

```typescript
  it("sets process status to generating when assistant content arrives", async () => {
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "你好" } });
    });

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send("conv-1", "Hi");
    });

    expect(result.current.delta).toBe("你好");
    expect(result.current.processStatus).toEqual({
      status: "running",
      label: "正在生成回答...",
    });
  });
```

- [ ] **Step 13: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: FAIL，`delta` 尚未设置生成回答状态。

- [ ] **Step 14: 最小实现 - 处理 delta 生成状态**

在 `delta` 分支中设置状态：

```typescript
              if (event.event === "delta") {
                accumulatedRef.current += event.data.content;
                setDelta(accumulatedRef.current);
                setProcessStatus({
                  status: "running",
                  label: "正在生成回答...",
                });
```

- [ ] **Step 15: 写失败测试 - 完成和失败后清空状态**

在 `apps/web/tests/chat/use-chat-stream.test.ts` 中追加两个断言到现有测试：

在 `"calls onComplete callback with accumulated response"` 测试末尾追加：

```typescript
    expect(result.current.processStatus).toBeNull();
```

在 `"sets error and streaming=false when streamChat throws"` 测试末尾追加：

```typescript
    expect(result.current.processStatus).toBeNull();
```

- [ ] **Step 16: 运行 useChatStream 测试**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts
```

Expected: PASS。

- [ ] **Step 17: 提交**

```bash
git add apps/web/features/chat/use-chat-stream.ts apps/web/tests/chat/use-chat-stream.test.ts
git commit -m "feat(chat): 跟踪 Agent 过程状态"
```

## Task 2: MessageRow 渲染过程状态 badge

**Files:**
- Modify: `apps/web/components/chat/message-row.tsx`
- Modify: `apps/web/tests/chat/message-row.test.tsx`

- [ ] **Step 1: 写失败测试 - running 状态显示文案和加载图标**

在 `apps/web/tests/chat/message-row.test.tsx` 中追加测试：

```typescript
  it("renders running process status above assistant content", () => {
    render(
      <MessageRow
        message={{
          id: "msg-4",
          conversationId: "conv-1",
          role: "assistant",
          content: "回复中",
          createdAt: "2026-07-05T00:00:00.000Z",
        }}
        processStatus={{
          status: "running",
          label: "正在调用 web-search...",
          toolName: "web-search",
        }}
      />,
    );

    expect(screen.getByText("正在调用 web-search...")).toBeInTheDocument();
    expect(screen.getByText("回复中")).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/message-row.test.tsx
```

Expected: FAIL，`MessageRow` 不接受 `processStatus` 属性。

- [ ] **Step 3: 最小实现 - 重命名 prop 并继续显示 running badge**

修改 `apps/web/components/chat/message-row.tsx`：

```typescript
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@chat-agent/shared";
import { AssistantMarkdown } from "./assistant-markdown";
import type { ProcessStatus } from "@/features/chat/use-chat-stream";

interface MessageRowProps {
  message: Message;
  processStatus?: ProcessStatus;
}

export function MessageRow({ message, processStatus }: MessageRowProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            isUser
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isUser ? "你" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        {processStatus && (
          <Badge
            variant="secondary"
            className="gap-1.5 bg-muted/50 text-xs font-normal"
          >
            {processStatus.status === "success" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {processStatus.label}
          </Badge>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted/50 text-foreground rounded-bl-md",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <AssistantMarkdown content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 写失败测试 - success 状态显示完成文案**

在 `apps/web/tests/chat/message-row.test.tsx` 中追加测试：

```typescript
  it("renders success process status above assistant content", () => {
    render(
      <MessageRow
        message={{
          id: "msg-5",
          conversationId: "conv-1",
          role: "assistant",
          content: "准备回答",
          createdAt: "2026-07-05T00:00:00.000Z",
        }}
        processStatus={{
          status: "success",
          label: "web-search 调用完成",
          toolName: "web-search",
        }}
      />,
    );

    expect(screen.getByText("web-search 调用完成")).toBeInTheDocument();
  });
```

- [ ] **Step 5: 运行 MessageRow 测试**

Run:

```bash
pnpm --filter web test tests/chat/message-row.test.tsx
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add apps/web/components/chat/message-row.tsx apps/web/tests/chat/message-row.test.tsx
git commit -m "feat(chat): 渲染 Agent 过程状态"
```

## Task 3: MessageList 只把过程状态传给当前流式助手消息

**Files:**
- Modify: `apps/web/components/chat/message-list.tsx`
- Modify: `apps/web/tests/chat/message-list.test.tsx`

- [ ] **Step 1: 写失败测试 - 状态只显示在流式助手消息上**

在 `apps/web/tests/chat/message-list.test.tsx` 中追加测试：

```typescript
  it("renders process status only for the streaming assistant message", () => {
    render(
      <MessageList
        messages={[
          message("msg-1", "历史回复"),
          message("streaming-assistant-conv-1", "流式回复"),
        ]}
        streamingMessageId="streaming-assistant-conv-1"
        processStatus={{
          status: "running",
          label: "正在调用 web-search...",
          toolName: "web-search",
        }}
      />,
    );

    expect(screen.getByText("正在调用 web-search...")).toBeInTheDocument();
    expect(screen.getAllByText("正在调用 web-search...")).toHaveLength(1);
    expect(screen.getByText("历史回复")).toBeInTheDocument();
    expect(screen.getByText("流式回复")).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/message-list.test.tsx
```

Expected: FAIL，`MessageList` 不接受 `processStatus` 和 `streamingMessageId`。

- [ ] **Step 3: 最小实现 - MessageList 传递 processStatus**

修改 `apps/web/components/chat/message-list.tsx`：

```typescript
import type { ProcessStatus } from "@/features/chat/use-chat-stream";

interface MessageListProps {
  messages: Message[];
  processStatus?: ProcessStatus | null;
  streamingMessageId?: string | null;
}

export function MessageList({
  messages,
  processStatus,
  streamingMessageId,
}: MessageListProps) {
```

将 `MessageRow` 调用改为：

```typescript
          {messages.map((msg) => (
            <MessageRow
              key={msg.id}
              message={msg}
              processStatus={
                msg.role === "assistant" &&
                processStatus &&
                msg.id === streamingMessageId
                  ? processStatus
                  : undefined
              }
            />
          ))}
```

- [ ] **Step 4: 运行 MessageList 测试**

Run:

```bash
pnpm --filter web test tests/chat/message-list.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/chat/message-list.tsx apps/web/tests/chat/message-list.test.tsx
git commit -m "feat(chat): 将过程状态绑定到流式消息"
```

## Task 4: ConversationPage 接线过程状态

**Files:**
- Modify: `apps/web/app/chat/[conversationId]/page.tsx`
- Modify: `apps/web/tests/chat/chat-flow.test.tsx`

- [ ] **Step 1: 写失败测试 - 页面显示工具调用过程状态**

在 `apps/web/tests/chat/chat-flow.test.tsx` 中追加测试：

```typescript
  it("displays process status for tool calls during streaming", async () => {
    mockListMessages.mockResolvedValue([]);
    mockStreamChat.mockImplementation(
      async (_input, handlers) =>
        new Promise<void>(() => {
          handlers.onEvent({
            event: "tool.start",
            id: 1,
            data: { toolName: "web-search", input: { query: "天气" } },
          });
        }),
    );

    render(<ConversationPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText("输入消息...");
    await user.type(textarea, "查天气");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(screen.getByText("正在调用 web-search...")).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test tests/chat/chat-flow.test.tsx
```

Expected: FAIL，页面尚未把 `processStatus` 传给 `MessageList`，且没有空内容的流式助手消息。

- [ ] **Step 3: 最小实现 - 传递 processStatus 并在只有状态时创建流式助手消息**

修改 `apps/web/app/chat/[conversationId]/page.tsx` 中 hook 解构：

```typescript
  const { streaming, delta, processStatus, send } = useChatStream({ onComplete: handleStreamComplete });
```

将 `visibleMessages` 改为：

```typescript
  const streamingMessageId = `streaming-assistant-${conversationId}`;

  const visibleMessages = useMemo(() => {
    if (!streaming || (!delta && !processStatus)) {
      return messages;
    }

    return [
      ...messages,
      {
        id: streamingMessageId,
        conversationId,
        role: "assistant" as const,
        content: delta,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [conversationId, delta, messages, processStatus, streaming, streamingMessageId]);
```

将 `MessageList` 调用改为：

```tsx
            <MessageList
              messages={visibleMessages}
              processStatus={processStatus}
              streamingMessageId={streaming ? streamingMessageId : null}
            />
```

- [ ] **Step 4: 运行页面聊天流测试**

Run:

```bash
pnpm --filter web test tests/chat/chat-flow.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 运行前端相关测试**

Run:

```bash
pnpm --filter web test tests/chat/use-chat-stream.test.ts tests/chat/message-row.test.tsx tests/chat/message-list.test.tsx tests/chat/chat-flow.test.tsx
```

Expected: PASS。

- [ ] **Step 6: 运行前端类型检查**

Run:

```bash
pnpm lint:web
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add 'apps/web/app/chat/[conversationId]/page.tsx' apps/web/tests/chat/chat-flow.test.tsx
git commit -m "feat(chat): 在会话页展示 Agent 过程状态"
```

## Task 5: 回归验证

**Files:**
- No code changes expected.

- [ ] **Step 1: 运行全部前端测试**

Run:

```bash
pnpm test:web
```

Expected: PASS。

- [ ] **Step 2: 运行全量类型检查**

Run:

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 3: 运行全量测试**

Run:

```bash
pnpm test
```

Expected: PASS。

- [ ] **Step 4: 最终状态检查**

Run:

```bash
git status --short
```

Expected: 没有未提交的代码改动；如果有测试产物或无关改动，不要提交，先确认来源。

## Self-Review

- Spec coverage: 计划覆盖思考中、工具调用中、工具完成、生成回答、完成/失败清空状态、只显示在当前流式助手消息上、不展示工具输入输出、不改后端协议。
- 完整性扫描：每个代码步骤都有目标文件、代码片段、运行命令和预期结果。
- Type consistency: 统一使用 `ProcessStatus`、`processStatus`、`streamingMessageId`；前端组件从 `toolStatus` 迁移为 `processStatus`。
