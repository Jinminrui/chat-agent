import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import responseFormatPlugin from '../src/plugins/response-format';

describe('response-format plugin', () => {
  it('reply.success returns unified format', async () => {
    const app = Fastify();
    await app.register(responseFormatPlugin);

    app.get('/test', async (req, reply) => {
      return reply.success({ id: 1 });
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ code: 0, msg: 'ok', data: { id: 1 } });
  });

  it('reply.error returns unified format', async () => {
    const app = Fastify();
    await app.register(responseFormatPlugin);

    app.get('/test', async (req, reply) => {
      return reply.code(401).error(2001, '未登录');
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ code: 2001, msg: '未登录', data: null });
  });
});
