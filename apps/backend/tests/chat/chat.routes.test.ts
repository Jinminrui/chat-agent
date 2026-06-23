import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

function parseSseEvents(body: string) {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
}

describe("chat stream route", () => {
  it("streams assistant deltas over SSE", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({ type: "final", content: "你好，世界" }),
      },
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/chat/stream",
        payload: {
          conversationId: "conv_1",
          message: "你好",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");
      expect(response.headers["cache-control"]).toContain("no-cache");
      const events = parseSseEvents(response.body);

      expect(events[0]).toEqual({
        type: "assistant.delta",
        delta: "你好，世界",
      });
      expect(events[1]).toMatchObject({
        type: "assistant.done",
      });
      expect(events[1]?.messageId).toEqual(expect.any(String));
      expect(events[1]?.messageId).not.toBe("");
    } finally {
      await app.close();
    }
  });

  it("streams an error event when provider returns a tool call", async () => {
    const app = buildApp({
      provider: {
        stream: async () => ({
          type: "tool-call",
          toolName: "search",
          input: { query: "天气" },
        }),
      },
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/chat/stream",
        payload: {
          conversationId: "conv_1",
          message: "你好",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("\"type\":\"error\"");
    } finally {
      await app.close();
    }
  });
});
