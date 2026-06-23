import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import {
  createConversation,
  listConversations,
  listMessages,
} from "./conversation.service";

type ConversationMessageParams = {
  id: string;
};

const unauthorizedSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string" },
  },
} as const;

const notFoundSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string" },
  },
} as const;

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
          201: {
            type: "object",
            required: ["conversation"],
            properties: {
              conversation: conversationSchema,
            },
          },
          401: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const conversation = await createConversation(userId);
      return reply.code(201).send({ conversation });
    },
  );

  app.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["items"],
            properties: {
              items: {
                type: "array",
                items: conversationSchema,
              },
            },
          },
          401: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const items = await listConversations(userId);
      return { items };
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
          200: {
            type: "object",
            required: ["items"],
            properties: {
              items: {
                type: "array",
                items: messageSchema,
              },
            },
          },
          401: unauthorizedSchema,
          404: notFoundSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ConversationMessageParams }>,
      reply,
    ) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const items = await listMessages(userId, request.params.id);

      if (!items) {
        return reply.code(404).send({ message: "Conversation not found" });
      }

      return { items };
    },
  );
};

export default conversationRoutes;
