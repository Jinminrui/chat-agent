import type { FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { ErrorCodes } from "../lib/error-codes";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authGuardPlugin = async (app: any) => {
  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session.userId;

    if (!userId) {
      return reply.code(401).error(ErrorCodes.AUTH_NOT_LOGGED_IN, "未登录");
    }

    request.userId = userId;
  });
};

export default fp(authGuardPlugin);
