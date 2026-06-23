import type { FastifyReply } from 'fastify';

export class SSEWriter {
  private id = 0;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(
    private reply: FastifyReply,
    private heartbeatInterval = 30000
  ) {
    // 使用 Fastify 的 reply 对象设置响应头，这样 CORS 头会被自动添加
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.raw.writeHead(200);

    this.startHeartbeat();
  }

  write(event: string, data: unknown) {
    const id = ++this.id;
    this.reply.raw.write(`event: ${event}\nid: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  delta(content: string) {
    this.write('delta', { content });
  }

  toolStart(toolName: string, input: unknown) {
    this.write('tool.start', { toolName, input });
  }

  toolEnd(toolName: string, output: unknown) {
    this.write('tool.end', { toolName, output });
  }

  done(messageId: string, totalTokens?: number) {
    this.write('done', { messageId, totalTokens });
    this.cleanup();
  }

  error(code: number, msg: string, details?: unknown) {
    this.write('error', { code, msg, ...details });
    this.cleanup();
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.write('heartbeat', { timestamp: Date.now() });
    }, this.heartbeatInterval);
  }

  private cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
