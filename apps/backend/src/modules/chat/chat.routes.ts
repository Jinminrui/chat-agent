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
const DEFAULT_CONVERSATION_TITLE = "New conversation";

function buildConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return normalized.slice(0, 24);
}

function toStreamError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "MAX_TOOL_CALLS_EXCEEDED"
  ) {
    return {
      code: ErrorCodes.CHAT_TOOL_CALL_LIMIT,
      msg: "工具调用次数超限",
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "TOOL_NOT_FOUND"
  ) {
    return {
      code: ErrorCodes.CHAT_TOOL_NOT_FOUND,
      msg: error instanceof Error ? error.message : "工具不存在",
    };
  }

  return {
    code: ErrorCodes.CHAT_TOOL_CALL_FAILED,
    msg: error instanceof Error ? error.message : "聊天执行失败",
  };
}

const chatRoutes: FastifyPluginAsync<ChatRoutesOptions> = async (
  app,
  { provider, prisma, tools },
) => {
  const checkpointService = createCheckpointService({ prisma });

  app.post(
    "/stream",
    {
      preHandler: [app.requireAuth],
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
      const userId = request.userId;

      const { conversationId, message } = request.body as {
        conversationId: string;
        message: string;
      };

      // Validate conversation exists and belongs to the user
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, userId: true, title: true },
      });

      if (!conversation || conversation.userId !== userId) {
        return reply.code(404).error(ErrorCodes.CHAT_CONVERSATION_NOT_FOUND, "会话不存在");
      }

      const historyMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          role: true,
          content: true,
        },
      });

      // Persist user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId,
          role: "user",
          content: message,
        },
        select: { id: true },
      });

      if (
        historyMessages.length === 0 &&
        conversation.title === DEFAULT_CONVERSATION_TITLE
      ) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            title: buildConversationTitle(message),
          },
        });
      }

      // 使用 SSEWriter
      const sse = new SSEWriter(reply);

      // Create agent runtime with streaming callbacks
      const runtime = createAgentRuntime({
        provider,
        tools,
        maxToolCalls: MAX_TOOL_CALLS,
        checkpointService,
        onDelta(content) {
          sse.delta(content);
        },
        onToolCall({ toolName, input }) {
          sse.toolStart(toolName, input);
        },
        onToolResult({ toolName, output }) {
          sse.toolEnd(toolName, output);
        },
      });

      try {
        const result = await runtime.run({
          messages: [
            ...historyMessages.map((historyMessage) => ({
              role: historyMessage.role as "user" | "assistant",
              content: historyMessage.content,
            })),
            { role: "user" as const, content: message },
          ],
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
        sse.done(assistantMessage.id);

        reply.raw.end();
      } catch (error) {
        const streamError = toStreamError(error);
        request.log.error({ err: error, conversationId, streamError }, "chat stream failed");
        sse.error(streamError.code, streamError.msg);
        reply.raw.end();
      }
    },
  );
};

export default chatRoutes;
