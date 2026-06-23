import { buildApp } from "./app";
import { setupPrismaLogging } from "./lib/prisma";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = buildApp();

  // 设置 Prisma 查询日志
  setupPrismaLogging(app.log);

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Backend listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
