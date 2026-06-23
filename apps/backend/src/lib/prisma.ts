import { PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 慢查询阈值（开发环境记录所有，生产环境只记录 > 100ms）
const SLOW_QUERY_MS = process.env.NODE_ENV === 'production' ? 100 : 0;

/**
 * 设置 Prisma 查询日志
 * 需要在 app 启动后调用，注入 logger
 */
export function setupPrismaLogging(logger: FastifyBaseLogger) {
  prisma.$on('query', (e) => {
    if (e.duration >= SLOW_QUERY_MS) {
      logger.info({
        type: 'db.query',
        query: e.query,
        duration: e.duration,
      }, 'database query');
    }
  });
}
