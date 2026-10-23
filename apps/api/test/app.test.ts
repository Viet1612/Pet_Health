import type { FastifyInstance } from 'fastify';
import { parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApp, type AppDeps } from '../src/app.js';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function makeApp(overrides: Partial<AppDeps> = {}): Promise<FastifyInstance> {
  app = await buildApp({
    checkDb: () => Promise.resolve(),
    lifecycle: { shuttingDown: false },
    registerRoutes: (api) => {
      // Route chỉ dùng trong test để kiểm body JSON.
      api.post(
        '/__echo',
        {
          schema: {
            body: z.object({ a: z.string() }),
            response: { 200: z.object({ n: z.number() }) },
          },
        },
        (req) => ({ n: (req.body as { a: string }).a.length }),
      );
    },
    ...overrides,
  });
  return app;
}

describe('health', () => {
  it('GET /api/v1/healthz → 200', async () => {
    const res = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('readyz → 200 khi DB sống', async () => {
    const res = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/readyz' });
    expect(res.statusCode).toBe(200);
  });

  it('readyz → 503 khi DB lỗi', async () => {
    const a = await makeApp({ checkDb: () => Promise.reject(new Error('down')) });
    const res = await a.inject({ method: 'GET', url: '/api/v1/readyz' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'unavailable' });
  });

  it('readyz → 503 khi đang tắt', async () => {
    const a = await makeApp({ lifecycle: { shuttingDown: true } });
    expect((await a.inject({ method: 'GET', url: '/api/v1/readyz' })).statusCode).toBe(503);
  });
});

describe('HTTP chung', () => {
  it('mọi phản hồi /api/* có Cache-Control: no-store, kể cả 404', async () => {
    const a = await makeApp();
    for (const url of ['/api/v1/healthz', '/api/v1/khong-ton-tai']) {
      const res = await a.inject({ method: 'GET', url });
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });

  it('body JSON đúng 64 KB thì nhận, 64 KB + 1 byte → 413', async () => {
    const a = await makeApp();
    const bodyOfSize = (size: number): string => JSON.stringify({ a: 'x'.repeat(size - 8) });
    expect(bodyOfSize(65_536)).toHaveLength(65_536);

    const okRes = await a.inject({
      method: 'POST',
      url: '/api/v1/__echo',
      headers: { 'content-type': 'application/json' },
      payload: bodyOfSize(65_536),
    });
    expect(okRes.statusCode).toBe(200);

    const tooBig = await a.inject({
      method: 'POST',
      url: '/api/v1/__echo',
      headers: { 'content-type': 'application/json' },
      payload: bodyOfSize(65_537),
    });
    expect(tooBig.statusCode).toBe(413);
  });

  it('body không phải JSON → 415', async () => {
    const res = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/__echo',
      headers: { 'content-type': 'text/plain' },
      payload: 'hello',
    });
    expect(res.statusCode).toBe(415);
  });
});

describe('OpenAPI', () => {
  it('OpenAPI 3.1, servers /api/v1, có /healthz và /readyz, ổn định giữa hai lần sinh', async () => {
    const gen = async (): Promise<string> => {
      const a = await buildApp({
        checkDb: () => Promise.resolve(),
        lifecycle: { shuttingDown: false },
      });
      await a.ready();
      const yaml = a.swagger({ yaml: true });
      await a.close();
      return yaml;
    };
    const first = await gen();
    expect(await gen()).toBe(first);

    const doc = parse(first) as {
      openapi: string;
      servers: { url: string }[];
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.servers[0]?.url).toBe('/api/v1');
    expect(Object.keys(doc.paths).sort()).toEqual(['/healthz', '/readyz']);
  });
});
