import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api/auth", () => ({
  register: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "demo@example.com",
    createdAt: "2026-06-24T00:00:00.000Z",
  }),
}));

import { register } from "@/lib/api/auth";
import RegisterPage from "../../app/register/page";

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /chat after a successful registration", async () => {
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("用户名"), "demo");
    await user.type(screen.getByLabelText("邮箱"), "demo@example.com");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        username: "demo",
        email: "demo@example.com",
        password: "password123",
      });
      expect(push).toHaveBeenCalledWith("/chat");
    });
  });
});
