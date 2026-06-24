import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageRow } from "@/components/chat/message-row";

describe("MessageRow", () => {
  it("renders assistant content as markdown", () => {
    render(
      <MessageRow
        message={{
          id: "msg-1",
          conversationId: "conv-1",
          role: "assistant",
          content: "# 标题\n\n- 列表项\n\n`行内代码`\n\n```ts\nconst x = 1;\n```",
          createdAt: "2026-06-24T00:00:00.000Z",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "标题" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("列表项")).toBeInTheDocument();
    expect(screen.getByText("行内代码").tagName).toBe("CODE");
    expect(screen.getByText("const x = 1;").tagName).toBe("CODE");
  });

  it("does not render assistant raw html as actual html", () => {
    const { container } = render(
      <MessageRow
        message={{
          id: "msg-2",
          conversationId: "conv-1",
          role: "assistant",
          content: "<script>alert('xss')</script><b>bold</b>",
          createdAt: "2026-06-24T00:00:00.000Z",
        }}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText(/alert\('xss'\)/)).toBeInTheDocument();
  });

  it("keeps user content as plain text", () => {
    render(
      <MessageRow
        message={{
          id: "msg-3",
          conversationId: "conv-1",
          role: "user",
          content: "# 用户标题",
          createdAt: "2026-06-24T00:00:00.000Z",
        }}
      />,
    );

    expect(
      screen.queryByRole("heading", { level: 1, name: "用户标题" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("# 用户标题")).toBeInTheDocument();
  });
});
