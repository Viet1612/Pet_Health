import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';

import { buildApp, type AppDeps } from '../src/app.js';
import { FakeClock } from '../src/platform/clock/clock.js';
import { ConflictError, RateLimitedError } from '../src/platform/errors/app-error.js';
import type { SessionResolverPort } from '../src/platform/http/auth.js';
import { REF_PATTERN } from '../src/platform/http/request-id.js';
import { memoryLogger, TEST_ORIGIN, testDeps } from './helpers.js';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const json = { 'content-type': 'application/json' };

async function makeApp(overrides: Partial<AppDeps> = {}): Promise<FastifyInstance> {
  app = await buildApp(
    testDeps({
      registerRoutes: (api) => {
        api.post(
          '/__pets',
          {
            config: { public: true },
            schema: {
              body: z.object({
                name: z.string().min(1).max(50),
                weightKg: z
                  .number()
                  .min(0.1, { error: 'Cân nặng phải từ 0,1 đến 150 kg' })
                  .max(150),
                birthDate: z.iso.date(),
              }),
              response: { 200: z.object({ ok: z.boolean() }) },
            },
          },
          () => ({ ok: true }),
        );
        api.get('/__conflict', { config: { public: true } }, () => {
          throw new ConflictError('PET_LIMIT_REACHED', 'Đã đạt tối đa 10 thú cưng');
        });
        api.get('/__limited', { config: { public: true } }, () => {
          throw new RateLimitedError(120);
        });
        api.get('/__boom', { config: { public: true } }, () => {
          throw new Error('SELECT * FROM users WHERE secret');
        });
        api.get('/__private', () => ({ ok: true }));
        api.get('/__public', { config: { public: true } }, () => ({ ok: true }));
      },
      ...overrides,
    }),
  );
  return app;
}

interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  ref: string;
  errors?: { field: string; code: string; message: string }[];
  retryAfter?: number;
}

function expectProblem(
  res: Awaited<ReturnType<FastifyInstance['inject']>>,
  status: number,
  code: string,
): Problem {
  expect(res.statusCode).toBe(status);
  expect(res.headers['content-type']).toContain('application/problem+json');
  const body = res.json<Problem>();
  expect(body).toMatchObject({
    status,
    code,
    type: `${TEST_ORIGIN}/errors/${code.toLowerCase().replaceAll('_', '-')}`,
  });
  expect(body.title).toEqual(expect.any(String));
  expect(body.ref).toMatch(REF_PATTERN);
  expect(res.headers['x-request-id']).toBe(body.ref);
  return body;
}

describe('problem+json', () => {
  it('lỗi schema → 422 VALIDATION_FAILED với errors[] tiếng Việt', async () => {
    const res = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/__pets',
      headers: json,
      payload: { name: '', weightKg: 0, birthDate: 'x', extra: 1 },
    });
    const body = expectProblem(res, 422, 'VALIDATION_FAILED');
    expect(body.title).toBe('Dữ liệu không hợp lệ');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        { field: 'name', code: 'REQUIRED', message: 'Trường bắt buộc' },
        { field: 'weightKg', code: 'OUT_OF_RANGE', message: 'Cân nặng phải từ 0,1 đến 150 kg' },
        { field: 'birthDate', code: 'INVALID_FORMAT', message: 'Không đúng định dạng' },
      ]),
    );
  });

  it('thiếu trường → REQUIRED; chuỗi quá dài → TOO_LONG', async () => {
    const res = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/__pets',
      headers: json,
      payload: { name: 'x'.repeat(51), birthDate: '2020-01-01' },
    });
    const body = expectProblem(res, 422, 'VALIDATION_FAILED');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        { field: 'name', code: 'TOO_LONG', message: 'Vượt quá độ dài cho phép' },
        { field: 'weightKg', code: 'REQUIRED', message: 'Trường bắt buộc' },
      ]),
    );
  });

  it('JSON hỏng → 400 MALFORMED_JSON', async () => {
    const res = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/__pets',
      headers: json,
      payload: '{"name": ',
    });
    expectProblem(res, 400, 'MALFORMED_JSON');
  });

  it('body > 64 KB → 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/__pets',
      headers: json,
      payload: JSON.stringify({ name: 'x'.repeat(70_000) }),
    });
    expectProblem(res, 413, 'PAYLOAD_TOO_LARGE');
  });

  it('content-type không hỗ trợ → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/__pets',
      headers: { 'content-type': 'text/plain' },
      payload: 'hi',
    });
    expectProblem(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('AppError giữ status, code, title của lỗi', async () => {
    const res = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/__conflict' });
    const body = expectProblem(res, 409, 'PET_LIMIT_REACHED');
    expect(body.title).toBe('Đã đạt tối đa 10 thú cưng');
  });

  it('RateLimitedError có header Retry-After và retryAfter', async () => {
    const res = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/__limited' });
    const body = expectProblem(res, 429, 'RATE_LIMITED');
    expect(res.headers['retry-after']).toBe('120');
    expect(body.retryAfter).toBe(120);
  });

  it('lỗi không lường trước → 500, không lộ stack/SQL, log cùng reqId = ref', async () => {
    const { logger, lines } = memoryLogger();
    const res = await (await makeApp({ logger })).inject({ method: 'GET', url: '/api/v1/__boom' });
    const body = expectProblem(res, 500, 'INTERNAL_ERROR');
    expect(body.title).toBe('Có lỗi xảy ra, vui lòng thử lại sau.');
    expect(res.body).not.toContain('SELECT');
    expect(res.body).not.toContain('stack');

    const errorLine = lines().find((l) => l.msg === 'unhandled error');
    expect(errorLine?.reqId).toBe(body.ref);
    expect(JSON.stringify(errorLine)).toContain('SELECT * FROM users');
  });

  it('đường dẫn không tồn tại → 404 NOT_FOUND', async () => {
    const res = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/khong-co' });
    expectProblem(res, 404, 'NOT_FOUND');
  });
});

describe('deny-by-default', () => {
  it('route không khai báo public → 401 UNAUTHENTICATED; route public → 200', async () => {
    const a = await makeApp();
    expectProblem(
      await a.inject({ method: 'GET', url: '/api/v1/__private' }),
      401,
      'UNAUTHENTICATED',
    );
    expect((await a.inject({ method: 'GET', url: '/api/v1/__public' })).statusCode).toBe(200);
  });

  it('resolver trả phiên thì route riêng tư chạy và có request.auth', async () => {
    const resolver: SessionResolverPort = {
      resolve: () => Promise.resolve({ userId: 'u1', sessionId: 's1', csrfSecret: null }),
    };
    const a = await makeApp({ sessionResolver: resolver });
    expect((await a.inject({ method: 'GET', url: '/api/v1/__private' })).statusCode).toBe(200);
  });

  it('log danh sách route public khi khởi động', async () => {
    const { logger, lines } = memoryLogger();
    await (await makeApp({ logger })).ready();
    const line = lines().find((l) => l.msg === 'public routes');
    expect(line?.publicRoutes).toEqual(
      expect.arrayContaining(['GET /api/v1/healthz', 'GET /api/v1/readyz', 'GET /api/v1/__public']),
    );
    expect(line?.publicRoutes).not.toContain('GET /api/v1/__private');
  });
});

describe('access log', () => {
  it('đúng 1 dòng mỗi request với reqId, route, status, durationMs; không có query string', async () => {
    const { logger, lines } = memoryLogger();
    const a = await makeApp({ logger });
    const res = await a.inject({ method: 'GET', url: '/api/v1/healthz?email=x@example.com' });
    const access = lines().filter((l) => l.msg === 'request completed');
    expect(access).toHaveLength(1);
    expect(access[0]).toMatchObject({
      reqId: res.headers['x-request-id'],
      method: 'GET',
      route: '/api/v1/healthz',
      status: 200,
    });
    expect(access[0]?.durationMs).toEqual(expect.any(Number) as unknown);
    expect(JSON.stringify(lines())).not.toContain('x@example.com');
  });
});

describe('POST /api/v1/__test/clock', () => {
  it('NODE_ENV=test: đặt giờ cho FakeClock, null thì về giờ thật', async () => {
    const clock = new FakeClock();
    const a = await makeApp({ clock });
    const res = await a.inject({
      method: 'POST',
      url: '/api/v1/__test/clock',
      headers: json,
      payload: { now: '2026-11-08T00:00:00Z', frozen: true },
    });
    expect(res.statusCode).toBe(200);
    expect(clock.now().toISOString()).toBe('2026-11-08T00:00:00.000Z');

    // Giờ có múi giờ, tua thêm 16 s.
    const adv = await a.inject({
      method: 'POST',
      url: '/api/v1/__test/clock',
      headers: json,
      payload: { now: '2026-11-08T00:01:00+07:00', frozen: true, advanceMs: 16_000 },
    });
    expect(adv.json()).toEqual({ now: '2026-11-07T17:01:16.000Z' });

    await a.inject({
      method: 'POST',
      url: '/api/v1/__test/clock',
      headers: json,
      payload: { now: null },
    });
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });

  it('NODE_ENV=production: 404 và không có trong openapi', async () => {
    const a = await makeApp({ nodeEnv: 'production', clock: new FakeClock() });
    const res = await a.inject({
      method: 'POST',
      url: '/api/v1/__test/clock',
      headers: json,
      payload: { now: '2026-11-08T00:00:00Z' },
    });
    expect(res.statusCode).toBe(404);
    await a.ready();
    const doc = parse(a.swagger({ yaml: true })) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths).some((p) => p.includes('__test'))).toBe(false);
  });
});
