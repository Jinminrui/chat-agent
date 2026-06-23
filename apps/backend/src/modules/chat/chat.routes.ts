import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { ChatProvider } from "../providers/provider.types";

type ChatRoutesOptions = {
  provider: ChatProvider;
};

const chatRoutes: FastifyPluginAsync<ChatRoutesOptions> = async (
  app,
  { provider },
) => {
  app.post(
    "/stream",
    {
      schema: {
        body: {
          type: "object",
          required: ["conversationId", "message"],
          additionalProperties: false,
          properties: {
            conversationId: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await provider.stream({
        messages: [{ role: "user", content: request.body.message }],
      });
      const messageId = randomUUID();

      const events =
        result.type === "final"
          ? [
              { type: "assistant.delta", delta: result.content },
              { type: "assistant.done", messageId },
            ]
          : [
              {
                type: "error",
                message: "Provider tool calls are not supported by this route.",
              },
            ];

      reply.hijack();
      reply.raw.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      });

      for (const event of events) {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      reply.raw.end();
    },
  );
};

export default chatRoutes;
