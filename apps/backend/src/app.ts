import cors from "@fastify/cors";
import Fastify from "fastify";
import authRoutes from "./modules/auth/auth.routes";
import chatRoutes from "./modules/chat/chat.routes";
import conversationRoutes from "./modules/conversations/conversation.routes";
import { createOpenAIProvider } from "./modules/providers/openai.provider";
import type { ChatProvider } from "./modules/providers/provider.types";
import authSessionPlugin from "./plugins/auth-session";

type BuildAppOptions = {
  provider?: ChatProvider;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const provider = options.provider ?? createOpenAIProvider();

  app.register(cors, {
    origin:
      process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  app.register(authSessionPlugin);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(chatRoutes, { prefix: "/chat", provider });
  app.register(conversationRoutes, { prefix: "/conversations" });

  return app;
}
