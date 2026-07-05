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

  it("renders running process status above assistant content", () => {
    render(
      <MessageRow
        message={{
          id: "msg-4",
          conversationId: "conv-1",
          role: "assistant",
          content: "回复中",
          createdAt: "2026-07-05T00:00:00.000Z",
        }}
        processStatus={{
          status: "running",
          label: "正在调用 web-search...",
          toolName: "web-search",
        }}
      />,
    );

    expect(screen.getByText("正在调用 web-search...")).toBeInTheDocument();
    expect(screen.getByText("回复中")).toBeInTheDocument();
  });

  it("renders success process status above assistant content", () => {
    render(
      <MessageRow
        message={{
          id: "msg-5",
          conversationId: "conv-1",
          role: "assistant",
          content: "准备回答",
          createdAt: "2026-07-05T00:00:00.000Z",
        }}
        processStatus={{
          status: "success",
          label: "web-search 调用完成",
          toolName: "web-search",
        }}
      />,
    );

    expect(screen.getByText("web-search 调用完成")).toBeInTheDocument();
  });

  it("does not render an empty assistant bubble while only process status is available", () => {
    const { container } = render(
      <MessageRow
        message={{
          id: "msg-6",
          conversationId: "conv-1",
          role: "assistant",
          content: "",
          createdAt: "2026-07-05T00:00:00.000Z",
        }}
        processStatus={{
          status: "running",
          label: "正在思考...",
        }}
      />,
    );

    expect(screen.getByText("正在思考...")).toBeInTheDocument();
    expect(container.querySelectorAll(".rounded-2xl")).toHaveLength(0);
  });
});
