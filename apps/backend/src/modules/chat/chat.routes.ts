import { type PrismaClient, Prisma } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import type { ChatProvider } from "../providers/provider.types";
import type { ToolMap } from "../tools/tool-registry";
import { createAgentRuntime } from "./agent-runtime";
import { createCheckpointService } from "./checkpoint.service";
import { SSEWriter } from "../../lib/sse";
import { ErrorCodes } from "../../lib/error-codes";

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
        return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
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
        return reply.code(404).error(ErrorCodes.CHAT_CONVERSATION_NOT_FOUND, "会话不存在");
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

      // 使用 SSEWriter
      const sse = new SSEWriter(reply);

      // Create agent runtime with streaming callbacks
      const runtime = createAgentRuntime({
        provider,
        tools,
        maxToolCalls: MAX_TOOL_CALLS,
        checkpointService,
        onToolCall({ toolName, input }) {
          sse.toolStart(toolName, input);
        },
        onToolResult({ toolName, output }) {
          sse.toolEnd(toolName, output);
        },
      });

      const result = await runtime.run({
        messages: [{ role: "user", content: message }],
        conversationId,
      });

      request.log.info({
        conversationId,
        toolCallCount: result.toolCalls.length,
        contentLength: result.content.length,
      }, 'agent run completed');

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
            toolInput: tc.input as Prisma.InputJsonValue,
            toolOutput: tc.output as Prisma.InputJsonValue,
            status: "completed",
          },
        });
      }

      // Cleanup old checkpoints (keep latest 5)
      await checkpointService.cleanup(conversationId, 5);

      // 使用 SSEWriter 发送事件
      sse.delta(result.content);
      sse.done(assistantMessage.id);

      reply.raw.end();
    },
  );
};

export default chatRoutes;
