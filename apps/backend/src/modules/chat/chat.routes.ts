import type { PrismaClient } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import type { ChatProvider } from "../providers/provider.types";
import type { ToolMap } from "../tools/tool-registry";
import { createAgentRuntime } from "./agent-runtime";
import { createCheckpointService } from "./checkpoint.service";

type ChatRoutesOptions = {
  provider: ChatProvider;
  prisma: Pick<
    PrismaClient,
    "conversation" | "message" | "toolCall" | "checkpoint"
  >;
  tools: ToolMap;
};

const MAX_TOOL_CALLS = 10;

const chatRoutes: FastifyPluginAsync<ChatRoutesOptions> = async (
  app,
  { provider, prisma, tools },
) => {
  const checkpointService = createCheckpointService({ prisma });

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
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { conversationId, message } = request.body as {
        conversationId: string;
        message: string;
      };

      // Validate conversation exists and belongs to the user
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, userId: true },
      });

      if (!conversation || conversation.userId !== userId) {
        return reply.code(404).send({ message: "Conversation not found" });
      }

      // Persist user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId,
          role: "user",
          content: message,
        },
        select: { id: true },
      });

      // Hijack the response and set SSE headers before running the agent
      reply.hijack();
      reply.raw.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      });

      function writeSseEvent(event: Record<string, unknown>) {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Create agent runtime with streaming callbacks
      const runtime = createAgentRuntime({
        provider,
        tools,
        maxToolCalls: MAX_TOOL_CALLS,
        checkpointService,
        onToolCall({ toolName, input }) {
          writeSseEvent({ type: "tool.status", status: "calling", toolName, input });
        },
        onToolResult({ toolName, output }) {
          writeSseEvent({ type: "tool.status", status: "done", toolName, output });
        },
      });

      const result = await runtime.run({
        messages: [{ role: "user", content: message }],
        conversationId,
      });

      // Persist assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: result.content,
        },
        select: { id: true },
      });

      // Persist tool calls
      for (const tc of result.toolCalls) {
        await prisma.toolCall.create({
          data: {
            conversationId,
            messageId: assistantMessage.id,
            toolName: tc.toolName,
            toolInput: tc.input as Record<string, unknown>,
            toolOutput: tc.output as Record<string, unknown>,
            status: "completed",
          },
        });
      }

      // Cleanup old checkpoints (keep latest 5)
      await checkpointService.cleanup(conversationId, 5);

      // Write final events
      writeSseEvent({ type: "assistant.delta", delta: result.content });
      writeSseEvent({ type: "assistant.done", messageId: assistantMessage.id });

      reply.raw.end();
    },
  );
};

export default chatRoutes;
