import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ conversationId: "test-conv-1" }),
}));

vi.mock("@/lib/api/conversations", () => ({
  listMessages: vi.fn(),
  listConversations: vi.fn().mockResolvedValue({ items: [] }),
  createConversation: vi.fn().mockResolvedValue({ id: "new-conv", title: "新会话", createdAt: "", updatedAt: "" }),
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
    mockListMessages.mockResolvedValue({
      items: [
        { id: "msg-1", conversationId: "test-conv-1", role: "user", content: "你好", createdAt: "2026-06-23T10:00:00Z" },
        { id: "msg-2", conversationId: "test-conv-1", role: "assistant", content: "你好！有什么可以帮你的？", createdAt: "2026-06-23T10:00:01Z" },
      ],
    });

    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText("你好")).toBeInTheDocument();
      expect(screen.getByText("你好！有什么可以帮你的？")).toBeInTheDocument();
    });

    expect(mockListMessages).toHaveBeenCalledWith("test-conv-1");
  });

  it("sends a message and displays the streamed response", async () => {
    mockListMessages.mockResolvedValue({ items: [] });
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ type: "assistant.delta", delta: "收到" });
      handlers.onEvent({ type: "assistant.delta", delta: "你的消息" });
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

  it("displays existing messages and new messages together", async () => {
    mockListMessages.mockResolvedValue({
      items: [
        { id: "msg-1", conversationId: "test-conv-1", role: "user", content: "第一条", createdAt: "2026-06-23T10:00:00Z" },
      ],
    });
    mockStreamChat.mockImplementation(async (_input, handlers) => {
      handlers.onEvent({ type: "assistant.delta", delta: "回复" });
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
