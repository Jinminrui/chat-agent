import cookie from "@fastify/cookie";
import session from "@fastify/session";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-session-secret-with-32-characters";

const authSessionPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cookie);
  await app.register(session, {
    secret: SESSION_SECRET,
    cookieName: "session",
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  });
};

export default fp(authSessionPlugin);
