import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { Composer } from "@/components/chat/composer";

describe("Composer", () => {
  it("renders textarea and submit button", () => {
    render(<Composer onSubmit={vi.fn()} />);

    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送" })).toBeInTheDocument();
  });

  it("calls onSubmit with trimmed value and clears input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText("输入消息...");
    await user.type(textarea, "Hello world");
    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(onSubmit).toHaveBeenCalledWith("Hello world");
    expect(textarea).toHaveValue("");
  });

  it("does not call onSubmit for empty input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit for whitespace-only input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText("输入消息...");
    await user.type(textarea, "   ");
    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
