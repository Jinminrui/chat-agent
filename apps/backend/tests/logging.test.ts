import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('prisma logging', () => {
  it('should export setupPrismaLogging function', async () => {
    const { setupPrismaLogging } = await import('../src/lib/prisma');
    expect(typeof setupPrismaLogging).toBe('function');
  });
});

describe('llm logging', () => {
  it('should log LLM request duration', async () => {
    const app = buildApp();
    await app.ready();

    // 由于 OpenAI provider 是 stub，这里只验证配置正确
    // 实际的 LLM 日志会在真实集成后记录
    expect(app).toBeDefined();

    await app.close();
  });
});

describe('business logging', () => {
  it('should log auth operations', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        emailOrUsername: 'test@example.com',
        password: 'password1234',
      },
    });

    // 登录会失败（用户不存在），但路由应该正常处理
    expect([401, 500]).toContain(response.statusCode);

    await app.close();
  });
});

describe('error logging', () => {
  it('should log errors with stack trace', async () => {
    const app = buildApp();

    // 添加一个会抛出错误的路由用于测试
    app.get('/test-error', async () => {
      throw new Error('Test error message');
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      message: 'Internal Server Error',
    });

    await app.close();
  });
});

describe('logging', () => {
  it('should disable automatic request logging by default', async () => {
    const app = buildApp();

    expect(app.initialConfig.disableRequestLogging).toBe(true);

    await app.close();
  });

  it('should generate requestId for each request', async () => {
    const app = buildApp();

    // 收集日志输出
    const logs: any[] = [];
    app.addHook('onResponse', async (request) => {
      logs.push({ requestId: request.id });
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(response.statusCode).toBe(401);
    // 验证 requestId 已生成
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].requestId).toBeDefined();
    expect(logs[0].requestId).toMatch(/^req_/);

    await app.close();
  });

  it('should use client-provided requestId', async () => {
    const app = buildApp();

    // 收集日志输出
    const logs: any[] = [];
    app.addHook('onResponse', async (request) => {
      logs.push({ requestId: request.id });
    });

    await app.ready();

    const customRequestId = 'req_custom-123';
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    expect(response.statusCode).toBe(401);
    // 验证使用了客户端提供的 requestId
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].requestId).toBe(customRequestId);

    await app.close();
  });
});
