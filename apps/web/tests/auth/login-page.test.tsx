import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoginPage from "../../app/login/page";

describe("LoginPage", () => {
  it("renders login form fields and button", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("邮箱或用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });
});
