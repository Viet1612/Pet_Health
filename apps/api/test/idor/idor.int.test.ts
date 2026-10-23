// Bộ test IDOR dùng chung (S1-08, FR-AUTH-013/014, NFR-SEC-004, AD-011). Tự liệt kê mọi route,
// sinh ca IDOR cho route có path param, kiểm deny-by-default và RLS. Cần Docker (Testcontainers).
//
// Route mới có path param → thêm `src/modules/<module>/adapters/http/__idor__/*.idor.ts` gọi
// registerIdorParam (+ registerIdorBody cho POST/PUT/PATCH), hoặc exemptFromIdor có lý do.
import type { FastifyInstance, InjectOptions } from 'fastify';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { PasswordHasher } from '../../src/modules/identity/application/password-hasher.js';
import { CookieSessionResolver } from '../../src/modules/identity/index.js';
import { registerModules, type ModuleDeps } from '../../src/modules/index.js';
import { FakeClock } from '../../src/platform/clock/clock.js';
import { newId } from '../../src/platform/ids.js';
import type { JobQueuePort } from '../../src/platform/queue/job-queue.port.js';
import { RateLimiter } from '../../src/platform/rate-limit/rate-limiter.js';
import { TEST_ORIGIN, testDeps } from '../helpers.js';
import { authHeaders, createTwoAccounts, type Account } from './accounts.js';
import { probeRoutes } from './probe.js';
import {
  bodyFor,
  customCases,
  exemptionOf,
  findParamFixture,
  type IdorParamFixture,
} from './registry.js';
import { createRouteCatalog, fillPath, type CatalogRoute } from './route-catalog.js';
import { loadModuleFixtures, startIdorDb, type IdorDb } from './setup.js';

/**
 * Route `public` được phép. Thêm route public mới phải sửa danh sách này một cách có chủ đích.
 * `POST /__test/clock` chỉ có khi NODE_ENV=test (kiểm ở ca "không có /__test/* ngoài test").
 */
const PUBLIC_ALLOWLIST = new Set([
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/verify-email',
  'POST /auth/password/forgot',
  'POST /auth/password/reset',
  'GET /healthz',
  'GET /readyz',
  'GET /media/:key',
  'POST /__test/clock',
]);

// Chỉ để liệt kê route khi thu thập ca test; handler không chạy nên deps để trống.
const stubDeps = { identity: {} } as unknown as ModuleDeps;

async function collectRoutes(
  nodeEnv: 'test' | 'production',
  withProbe: boolean,
): Promise<CatalogRoute[]> {
  const catalog = createRouteCatalog();
  const app = await buildApp({
    ...testDeps(),
    nodeEnv,
    clock: new FakeClock(),
    onRoute: catalog.onRoute,
    registerRoutes: async (api) => {
      await registerModules(api, stubDeps);
      if (withProbe) await api.register(probeRoutes);
    },
  });
  await app.ready();
  await app.close();
  return catalog.routes;
}

const fixtureFiles = await loadModuleFixtures();
const routes = await collectRoutes('test', true);
const label = (r: CatalogRoute): string => `${r.method} ${r.url}`;
const needsIdor = (r: CatalogRoute): boolean =>
  !r.public && r.params.length > 0 && exemptionOf(r.method, r.url) === undefined;

/** Job queue giả: bộ test này không cần pg-boss. */
const fakeJobQueue: JobQueuePort = { enqueue: () => Promise.resolve(newId()) };

let env: IdorDb;
let app: FastifyInstance;
let a: Account;
let b: Account;

beforeAll(async () => {
  env = await startIdorDb();
  const clock = new FakeClock();
  clock.set(new Date('2026-10-24T03:00:00Z'), { frozen: true });
  const identity = {
    db: env.appDb,
    clock,
    jobQueue: fakeJobQueue,
    rateLimiter: new RateLimiter(env.appDb, clock),
    hasher: new PasswordHasher(),
    trustCfConnectingIp: false,
    analyticsHmacKey: 'idor-test-analytics-hmac-key',
  };
  app = await buildApp({
    ...testDeps(),
    csrf: true,
    clock,
    db: env.appDb,
    sessionResolver: new CookieSessionResolver(env.appDb, clock),
    registerRoutes: async (api) => {
      await registerModules(api, { identity });
      await api.register(probeRoutes);
    },
  });
  await app.ready();
  ({ a, b } = await createTwoAccounts(app));
}, 180_000);

afterAll(async () => {
  await app.close().catch(() => undefined);
  await env.close();
}, 60_000);

function call(route: CatalogRoute, ids: Record<string, string>, account?: Account) {
  const headers: Record<string, string> = account ? authHeaders(account) : { origin: TEST_ORIGIN };
  if (route.method === 'POST') headers['idempotency-key'] = newId();
  const body = bodyFor(route.method, route.url, ids);
  return app.inject({
    method: route.method as InjectOptions['method'],
    url: fillPath(route.url, ids),
    headers,
    ...(body === undefined ? {} : { payload: body as InjectOptions['payload'] }),
  });
}

function fixturesOf(route: CatalogRoute): [string, IdorParamFixture][] {
  return route.params.map((p) => {
    const fx = findParamFixture(route.url, p);
    if (!fx) throw new Error(`Thiếu fixture IDOR cho ${label(route)} (${p})`);
    return [p, fx];
  });
}

/** Tạo tài nguyên mới của `owner` cho mọi param của route; trả ids và hàm chụp snapshot. */
async function createFor(route: CatalogRoute, owner: Account) {
  const ids: Record<string, string> = {};
  const fxs = fixturesOf(route);
  for (const [param, fx] of fxs) {
    ids[param] = await fx.create({ app, owner, db: env.workerDb });
  }
  const snapshot = () =>
    Promise.all(
      fxs.map(([param, fx]) =>
        fx.snapshot({ db: env.workerDb, ownerId: owner.userId, id: ids[param] ?? '' }),
      ),
    );
  return { ids, snapshot };
}

const withoutRef = (body: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'ref'));

describe('meta: phủ route', () => {
  it('mọi (route có path param, param) có fixture hoặc được miễn', () => {
    const missing = routes
      .filter(needsIdor)
      .flatMap((r) =>
        r.params
          .filter((p) => !findParamFixture(r.url, p))
          .map((p) => `Thiếu fixture IDOR cho ${label(r)} (${p}). Thêm file __idor__/*.idor.ts`),
      );
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('báo cáo route được miễn và file fixture đã nạp', () => {
    const exempt = routes
      .map((r) => ({ route: label(r), reason: exemptionOf(r.method, r.url) }))
      .filter((e) => e.reason !== undefined);
    process.stdout
      .write(`[idor] fixture: ${JSON.stringify(fixtureFiles)} miễn: ${JSON.stringify(exempt)}
`);
    expect(exempt.every((e) => Boolean(e.reason))).toBe(true);
  });

  it('không có route /__test/* ngoài NODE_ENV=test', async () => {
    const prod = await collectRoutes('production', false);
    expect(prod.filter((r) => r.url.startsWith('/__test')).map(label)).toEqual([]);
  });
});

describe('meta: deny by default', () => {
  it('route public nằm trong danh sách cho phép', () => {
    const extra = routes.filter((r) => r.public && !PUBLIC_ALLOWLIST.has(label(r))).map(label);
    expect(extra, `Route public chưa được cho phép: ${extra.join(', ')}`).toEqual([]);
  });

  for (const route of routes.filter((r) => !r.public)) {
    it(`401 khi không có phiên: ${label(route)}`, async () => {
      const ids = Object.fromEntries(route.params.map((p) => [p, newId()]));
      const res = await call(route, ids);
      expect(res.statusCode, res.body).toBe(401);
      expect(res.json<{ code: string }>().code).toBe('UNAUTHENTICATED');
    });
  }
});

describe('meta: RLS', () => {
  it('mọi bảng public có owner_id bật RLS + FORCE + policy owner_isolation', async () => {
    const { rows } = await sql<{ table: string; rls: boolean; force: boolean; policy: boolean }>`
      SELECT c.relname AS table, c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
             EXISTS (
               SELECT 1 FROM pg_policies p
               WHERE p.schemaname = 'public' AND p.tablename = c.relname
                 AND p.policyname = 'owner_isolation'
             ) AS policy
      FROM information_schema.columns col
      JOIN pg_namespace n ON n.nspname = col.table_schema
      JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = col.table_name AND c.relkind = 'r'
      WHERE col.table_schema = 'public' AND col.column_name = 'owner_id'
      ORDER BY c.relname`.execute(env.ownerDb);
    expect(rows.map((r) => r.table)).toContain('idor_probe');
    const bad = rows.filter((r) => !r.rls || !r.force || !r.policy).map((r) => r.table);
    expect(bad, `Bảng có owner_id thiếu RLS (enableOwnerRls): ${bad.join(', ')}`).toEqual([]);
  });
});

describe('IDOR', () => {
  for (const route of routes.filter(needsIdor)) {
    it(`IDOR ${label(route)} [${route.params.join(', ')}]`, async () => {
      // 1–5. A dùng ID của B → 404 problem+json, dữ liệu của B không đổi.
      const target = await createFor(route, b);
      const before = await target.snapshot();
      const res = await call(route, target.ids, a);
      expect(res.statusCode, res.body).toBe(404);
      expect(res.headers['content-type']).toContain('application/problem+json');
      const foreign = res.json<Record<string, unknown>>();
      expect(foreign.code).toBe('NOT_FOUND');
      expect(await target.snapshot()).toEqual(before);

      // 6. ID không tồn tại → 404 giống hệt (trừ ref).
      const randomIds = Object.fromEntries(route.params.map((p) => [p, newId()]));
      const missing = await call(route, randomIds, a);
      expect(missing.statusCode).toBe(404);
      expect(withoutRef(missing.json())).toEqual(withoutRef(foreign));

      // 7. Kiểm fixture: B gọi tài nguyên (mới) của chính mình → không phải 404.
      const own = await createFor(route, b);
      const ownRes = await call(route, own.ids, b);
      expect(ownRes.statusCode, ownRes.body).not.toBe(404);
      expect(ownRes.statusCode, ownRes.body).toBeLessThan(500);
    });
  }

  for (const [name, run] of customCases()) {
    it(`IDOR custom: ${name}`, () => run({ app, a, b, db: env.workerDb }));
  }
});
