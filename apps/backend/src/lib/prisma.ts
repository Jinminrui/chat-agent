import { Prisma, PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

const enablePrismaQueryLogs = process.env.LOG_PRISMA_QUERIES === "true";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      ...(enablePrismaQueryLogs
        ? ([{ level: "query", emit: "event" }] as const)
        : []),
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 慢查询阈值（开发环境记录所有，生产环境只记录 > 100ms）
const SLOW_QUERY_MS = process.env.NODE_ENV === "production" ? 100 : 0;

/**
 * 设置 Prisma 查询日志。
 * 默认不输出 query 明细；仅当 LOG_PRISMA_QUERIES=true 时订阅 query 事件。
 */
export function setupPrismaLogging(logger: FastifyBaseLogger) {
  if (!enablePrismaQueryLogs) {
    return;
  }

  prisma.$on("query" as never, (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_MS) {
      logger.info(
        {
          type: "db.query",
          duration: e.duration,
        },
        "database query",
      );
    }
  });
}
