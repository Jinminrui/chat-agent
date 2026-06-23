import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/auth", () => ({
  login: vi.fn(),
}));

import LoginPage from "../../app/login/page";

describe("LoginPage", () => {
  it("renders login form fields and button", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("用户名或邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });
});
