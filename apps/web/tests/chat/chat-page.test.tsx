import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ChatPage from "../../app/chat/page";

describe("ChatPage", () => {
  it("renders the new conversation button and composer", () => {
    render(<ChatPage />);

    expect(screen.getByRole("button", { name: "新建会话" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument();
  });
});
