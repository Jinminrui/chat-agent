import fp from 'fastify-plugin';
import { success, error } from '../lib/response';

declare module 'fastify' {
  interface FastifyReply {
    success<T>(data: T, msg?: string): FastifyReply;
    error(code: number, msg: string): FastifyReply;
  }
}

export default fp(async (app) => {
  app.decorateReply('success', function (data: unknown, msg = 'ok') {
    return this.send(success(data, msg));
  });

  app.decorateReply('error', function (code: number, msg: string) {
    return this.send(error(code, msg));
  });
});
