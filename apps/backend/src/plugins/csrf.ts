import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ErrorCodes } from "../lib/error-codes";

const WRITE_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

const csrfPlugin = async (app: any) => {
  // 测试环境跳过 CSRF 校验（app.inject 不发送 Origin 头）
  if (process.env.NODE_ENV === "test") return;

  const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim());

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!WRITE_METHODS.has(request.method)) return;

    const origin = request.headers.origin || request.headers.referer;

    if (!origin || !allowedOrigins.some((o) => origin.startsWith(o))) {
      return reply.code(403).error(ErrorCodes.AUTH_CSRF_REJECTED, "请求来源不允许");
    }
  });
};

export default fp(csrfPlugin);
