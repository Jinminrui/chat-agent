import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ conversationId: "test-conv" }),
}));

vi.mock("@/lib/api/conversations", () => ({
  listConversations: vi.fn().mockResolvedValue({ items: [] }),
  listMessages: vi.fn().mockResolvedValue({ items: [] }),
  createConversation: vi.fn().mockResolvedValue({ id: "new-conv", title: "新会话", createdAt: "", updatedAt: "" }),
}));

import ChatPage from "../../app/chat/page";

describe("ChatPage", () => {
  it("renders the new conversation button and composer", () => {
    render(<ChatPage />);

    expect(screen.getByRole("button", { name: "新建会话" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument();
  });
});
