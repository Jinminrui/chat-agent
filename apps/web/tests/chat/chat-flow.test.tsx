import { render, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({ conversationId: "test-conv-1" }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/chat/test-conv-1",
}));

vi.mock("@/lib/api/auth", () => ({
  getMe: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "demo@example.com",
    createdAt: "2026-06-24T00:00:00.000Z",
  }),
}));

vi.mock("@/lib/api/conversations", () => ({
  listMessages: vi.fn(),
  listConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({ id: "new-conv", userId: "user-1", title: "新会话", createdAt: "", updatedAt: "" }),
}));

vi.mock("@/lib/api/chat", () => ({
  streamChat: vi.fn(),
}));

import { listMessages } from "@/lib/api/conversations";
import { streamChat } from "@/lib/api/chat";
import ConversationPage from "../../app/chat/[conversationId]/page";

const mockListMessages = vi.mocked(listMessages);
const mockStreamChat = vi.mocked(streamChat);

describe("ConversationPage chat flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads existing messages on mount", async () => {
    mockListMessages.mockResolvedValue([
      { id: "msg-1", conversationId: "test-conv-1", role: "user", content: "你好", createdAt: "2026-06-23T10:00:00Z" },
      { id: "msg-2", conversationId: "test-conv-1", role: "assistant", content: "# 回复标题\n\n- 第一项", createdAt: "2026-06-23T10:00:01Z" },
    ]);

    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText("你好")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "回复标题" })).toBeInTheDocument();
      const lists = screen.getAllByRole("list");
      expect(within(lists[lists.length - 1]!).getByText("第一项")).toBeInTheDocument();
    });

    expect(mockListMessages).toHaveBeenCalledWith("test-conv-1");
  });

  it("sends a message and displays the streamed response", async () => {
    mockListMessages.mockResolvedValue([]);
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "## 流式标题\n\n" } });
      handlers.onEvent({ event: "delta", id: 2, data: { content: "- 收到你的消息" } });
      handlers.onComplete?.();
    });

    render(<ConversationPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText("输入消息...");
    await user.type(textarea, "测试消息");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(screen.getByText("测试消息")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "流式标题" })).toBeInTheDocument();
      expect(screen.getByText("收到你的消息")).toBeInTheDocument();
    });

    expect(mockStreamChat).toHaveBeenCalledWith(
      { conversationId: "test-conv-1", message: "测试消息" },
      expect.objectContaining({
        onEvent: expect.any(Function),
        onComplete: expect.any(Function),
      }),
    );
  });

  it("renders the streaming response as an assistant message before completion", async () => {
    mockListMessages.mockResolvedValue([]);
    mockStreamChat.mockImplementation(
      async (_input, handlers) =>
        new Promise<void>(() => {
          handlers.onEvent({
            event: "delta",
            id: 1,
            data: { content: "正在生成" },
          });
        }),
    );

    render(<ConversationPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText("输入消息...");
    await user.type(textarea, "测试消息");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(screen.getByText("AI")).toBeInTheDocument();
      expect(screen.getByText("正在生成")).toBeInTheDocument();
    });
  });

  it("displays existing messages and new messages together", async () => {
    mockListMessages.mockResolvedValue([
      { id: "msg-1", conversationId: "test-conv-1", role: "user", content: "第一条", createdAt: "2026-06-23T10:00:00Z" },
    ]);
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ event: "delta", id: 1, data: { content: "回复" } });
      handlers.onComplete?.();
    });

    render(<ConversationPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("第一条")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("输入消息...");
    await user.type(textarea, "第二条");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(screen.getByText("第一条")).toBeInTheDocument();
      expect(screen.getByText("第二条")).toBeInTheDocument();
      expect(screen.getByText("回复")).toBeInTheDocument();
    });
  });
});
