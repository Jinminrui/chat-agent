import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({ conversationId: "test-conv" }),
  usePathname: () => "/chat",
}));

vi.mock("@/lib/api/auth", () => ({
  getMe: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "demo@example.com",
    createdAt: "2026-06-24T00:00:00.000Z",
  }),
  logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api/conversations", () => ({
  listConversations: vi.fn().mockResolvedValue([]),
  listMessages: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({ id: "new-conv", userId: "user-1", title: "新会话", createdAt: "", updatedAt: "" }),
}));

import { getMe, logout } from "@/lib/api/auth";
import ChatPage from "../../app/chat/page";

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMe).mockResolvedValue({
      id: "user-1",
      email: "demo@example.com",
      createdAt: "2026-06-24T00:00:00.000Z",
    });
  });

  it("renders the new conversation button and composer", async () => {
    render(<ChatPage />);

    expect(await screen.findByRole("button", { name: "新建会话" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument();
  });

  it("redirects to login when session validation fails", async () => {
    vi.mocked(getMe).mockRejectedValueOnce(new Error("未登录"));

    render(<ChatPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("logs out from the sidebar menu", async () => {
    render(<ChatPage />);
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "新建会话" });
    await user.click(screen.getByRole("button", { name: /设置/i }));
    await user.click(await screen.findByText("退出登录"));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });
});
