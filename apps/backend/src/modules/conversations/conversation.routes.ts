import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { successResponseSchema, errorResponseSchema } from "../auth/auth.schema";
import {
  createConversation,
  listConversations,
  listMessages,
} from "./conversation.service";
import { ErrorCodes } from "../../lib/error-codes";

type ConversationMessageParams = {
  id: string;
};

const conversationSchema = {
  type: "object",
  required: ["id", "userId", "title", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    title: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
} as const;

const messageSchema = {
  type: "object",
  required: ["id", "conversationId", "role", "content", "createdAt"],
  properties: {
    id: { type: "string" },
    conversationId: { type: "string" },
    role: { type: "string" },
    content: { type: "string" },
    createdAt: { type: "string" },
  },
} as const;

const conversationRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
        },
        response: {
          201: successResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
      }

      const conversation = await createConversation(userId);
      return reply.code(201).success({ conversation });
    },
  );

  app.get(
    "/",
    {
      schema: {
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
      }

      const items = await listConversations(userId);
      return reply.success({ items });
    },
  );

  app.get(
    "/:id/messages",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ConversationMessageParams }>,
      reply,
    ) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
      }

      const items = await listMessages(userId, request.params.id);

      if (!items) {
        return reply.code(404).error(ErrorCodes.CONVERSATION_NOT_FOUND, "会话不存在");
      }

      return reply.success({ items });
    },
  );
};

export default conversationRoutes;
