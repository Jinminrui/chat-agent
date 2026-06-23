import type { FastifyPluginAsync } from "fastify";
import {
  registerBodySchema,
  unauthorizedSchema,
  userEnvelopeSchema,
} from "./auth.schema";
import { getCurrentUser, registerUser } from "./auth.service";

declare module "@fastify/session" {
  interface FastifySessionObject {
    userId?: string;
  }
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/register",
    {
      schema: {
        body: registerBodySchema,
        response: {
          201: userEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await registerUser(request.body);

      request.session.userId = user.id;

      return reply.code(201).send({ user });
    },
  );

  app.get(
    "/me",
    {
      schema: {
        response: {
          200: userEnvelopeSchema,
          401: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const user = await getCurrentUser(userId);

      if (!user) {
        delete request.session.userId;
        return reply.code(401).send({ message: "Unauthorized" });
      }

      return { user };
    },
  );
};

export default authRoutes;
