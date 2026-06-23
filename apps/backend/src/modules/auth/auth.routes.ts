import type { FastifyPluginAsync } from "fastify";
import {
  type LoginBody,
  type RegisterBody,
  loginBodySchema,
  registerBodySchema,
  unauthorizedSchema,
  userEnvelopeSchema,
} from "./auth.schema";
import { getCurrentUser, loginUser, registerUser } from "./auth.service";

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
          409: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await registerUser(request.body as RegisterBody);

        request.session.userId = user.id;
        request.log.info({ userId: user.id }, 'user registered');

        return reply.code(201).send({ user });
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error as { name: string }).name === "EMAIL_ALREADY_EXISTS"
        ) {
          request.log.warn({ email: (request.body as RegisterBody).email }, 'registration failed: email already exists');
          return reply.code(409).send({ message: "Email already exists" });
        }
        throw error;
      }
    },
  );

  app.post(
    "/login",
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: userEnvelopeSchema,
          401: unauthorizedSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await loginUser(request.body as LoginBody);

      if (!user) {
        request.log.warn({ emailOrUsername: (request.body as LoginBody).emailOrUsername }, 'login failed: invalid credentials');
        return reply.code(401).send({ message: "Unauthorized" });
      }

      request.session.userId = user.id;
      request.log.info({ userId: user.id }, 'user logged in');

      return { user };
    },
  );

  app.post("/logout", async (request, reply) => {
    const userId = request.session.userId;
    request.session.userId = undefined;
    await request.session.destroy();
    request.log.info({ userId }, 'user logged out');
    return reply.code(204).send();
  });

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
