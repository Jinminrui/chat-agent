import cookie from "@fastify/cookie";
import session from "@fastify/session";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const SESSION_SECRET = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production" && !SESSION_SECRET) {
  throw new Error("SESSION_SECRET 环境变量必须配置");
}

const secret = SESSION_SECRET ?? "dev-session-secret-with-32-characters";

const authSessionPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cookie);
  await app.register(session, {
    secret,
    cookieName: "session",
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    },
  });
};

export default fp(authSessionPlugin);
