import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "@/components/chat/message-list";
import type { Message } from "@chat-agent/shared";

const scrollIntoView = vi.fn();

function message(id: string, content: string): Message {
  return {
    id,
    conversationId: "conv-1",
    role: "assistant",
    content,
    createdAt: "2026-07-02T00:00:00.000Z",
  };
}

function setViewportMetrics(
  viewport: Element,
  metrics: { scrollTop: number; clientHeight: number; scrollHeight: number },
) {
  Object.defineProperties(viewport, {
    scrollTop: {
      configurable: true,
      value: metrics.scrollTop,
      writable: true,
    },
    clientHeight: {
      configurable: true,
      value: metrics.clientHeight,
    },
    scrollHeight: {
      configurable: true,
      value: metrics.scrollHeight,
    },
  });
}

describe("MessageList scrolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it("keeps following the bottom when new messages arrive near the bottom", () => {
    const { container, rerender } = render(
      <MessageList messages={[message("msg-1", "第一条")]} />,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');

    expect(viewport).not.toBeNull();
    setViewportMetrics(viewport!, {
      scrollTop: 92,
      clientHeight: 100,
      scrollHeight: 200,
    });
    fireEvent.scroll(viewport!);
    scrollIntoView.mockClear();

    rerender(
      <MessageList
        messages={[
          message("msg-1", "第一条"),
          message("msg-2", "流式追加"),
        ]}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "end" });
  });

  it("pauses auto follow when the user scrolls away and resumes from the bottom button", async () => {
    const { container, rerender } = render(
      <MessageList messages={[message("msg-1", "第一条")]} />,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    const user = userEvent.setup();

    expect(viewport).not.toBeNull();
    setViewportMetrics(viewport!, {
      scrollTop: 20,
      clientHeight: 100,
      scrollHeight: 240,
    });
    fireEvent.scroll(viewport!);
    scrollIntoView.mockClear();

    rerender(
      <MessageList
        messages={[
          message("msg-1", "第一条"),
          message("msg-2", "新的回复"),
        ]}
      />,
    );

    expect(scrollIntoView).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "回到底部" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "end",
      behavior: "smooth",
    });
  });

  it("renders process status only for the streaming assistant message", () => {
    render(
      <MessageList
        messages={[
          message("msg-1", "历史回复"),
          message("streaming-assistant-conv-1", "流式回复"),
        ]}
        streamingMessageId="streaming-assistant-conv-1"
        processStatus={{
          status: "running",
          label: "正在调用 web-search...",
          toolName: "web-search",
        }}
      />,
    );

    expect(screen.getByText("正在调用 web-search...")).toBeInTheDocument();
    expect(screen.getAllByText("正在调用 web-search...")).toHaveLength(1);
    expect(screen.getByText("历史回复")).toBeInTheDocument();
    expect(screen.getByText("流式回复")).toBeInTheDocument();
  });
});
