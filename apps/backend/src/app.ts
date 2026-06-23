import cors from "@fastify/cors";
import Fastify from "fastify";
import authSessionPlugin from "./plugins/auth-session";
import authRoutes from "./modules/auth/auth.routes";

export function buildApp() {
  const app = Fastify();

  app.register(cors, {
    origin:
      process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  app.register(authSessionPlugin);
  app.register(authRoutes, { prefix: "/auth" });

  return app;
}
