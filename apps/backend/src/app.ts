import cors from "@fastify/cors";
import Fastify from "fastify";
import { prisma } from "./lib/prisma";
import authRoutes from "./modules/auth/auth.routes";
import chatRoutes from "./modules/chat/chat.routes";
import conversationRoutes from "./modules/conversations/conversation.routes";
import { createOpenAIProvider } from "./modules/providers/openai.provider";
import type { ChatProvider } from "./modules/providers/provider.types";
import type { ToolMap } from "./modules/tools/tool-registry";
import { currentTimeTool } from "./modules/tools/builtins/current-time.tool";
import { fetchUrlTool } from "./modules/tools/builtins/fetch-url.tool";
import { webSearchTool } from "./modules/tools/builtins/web-search.tool";
import authSessionPlugin from "./plugins/auth-session";
import authGuardPlugin from "./plugins/auth-guard";
import csrfPlugin from "./plugins/csrf";
import responseFormatPlugin from "./plugins/response-format";

type BuildAppOptions = {
  provider?: ChatProvider;
  tools?: ToolMap;
};

const defaultTools: ToolMap = {
  "current-time": currentTimeTool,
  "fetch-url": fetchUrlTool,
  "web-search": webSearchTool,
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    genReqId: (req) => {
      // 优先使用客户端传入的 requestId，否则自动生成
      const clientRequestId = req.headers['x-request-id'];
      if (clientRequestId && typeof clientRequestId === 'string') {
        return clientRequestId;
      }
      return `req_${crypto.randomUUID()}`;
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });
  const provider = options.provider ?? createOpenAIProvider({ logger: app.log });
  const tools = options.tools ?? defaultTools;

  app.register(cors, {
    origin:
      process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  app.register(authSessionPlugin);
  app.register(authGuardPlugin);
  app.register(csrfPlugin);
  app.register(responseFormatPlugin);
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(chatRoutes, { prefix: "/api/chat", provider, prisma, tools });
  app.register(conversationRoutes, { prefix: "/api/conversations" });

  // 全局错误处理器
  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    request.log.error({
      err: error,
      statusCode,
    }, message);

    reply.code(statusCode).send({ message: 'Internal Server Error' });
  });

  return app;
}
