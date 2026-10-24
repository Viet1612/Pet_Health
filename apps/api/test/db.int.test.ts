// Integration với PostgreSQL 16 thật (Testcontainers, cần Docker): migration, pg-boss, enqueue
// trong transaction, readyz khi DB dừng.
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sql, type Kysely } from 'kysely';
import type { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { withUserTx } from '../src/platform/db/with-user-tx.js';
import { newId } from '../src/platform/ids.js';
import { createDb, createPool, type Database } from '../src/platform/db/kysely.js';
import { createMigrator } from '../src/platform/db/migrator.js';
import { createBoss, ensureQueues, PgBossJobQueue } from '../src/platform/queue/pg-boss.adapter.js';
import { QUEUES } from '../src/platform/queue/queues.js';
import { testDeps } from './helpers.js';

let container: StartedPostgreSqlContainer;
let db: Kysely<Database>;
let boss: PgBoss;

async function migrateAll(url: string): Promise<{ migrated: string[]; queues: string[] }> {
  const mdb = createDb(createPool(url, 1, undefined));
  const { error, results } = await createMigrator(mdb).migrateToLatest();
  await mdb.destroy();
  if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
  const mboss = createBoss(url, 'migrate', 1);
  await mboss.start();
  const queues = await ensureQueues(mboss);
  await mboss.stop({ graceful: false });
  return { migrated: (results ?? []).map((r) => r.migrationName), queues };
}

const jobCount = async (): Promise<number> => {
  const { rows } = await sql<{ n: string }>`SELECT count(*)::text AS n FROM pgboss.job`.execute(db);
  return Number(rows[0]?.n);
};

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  const url = container.getConnectionUri();
  // Role ứng dụng (S1-01) phải có trước migration, giống infra/dev/roles.sql.
  const admin = createDb(createPool(url, 1, undefined));
  await sql`CREATE ROLE app_rw LOGIN NOBYPASSRLS PASSWORD 'app_rw_test'`.execute(admin);
  await sql`CREATE ROLE app_worker LOGIN BYPASSRLS PASSWORD 'app_worker_test'`.execute(admin);
  await admin.destroy();
  const first = await migrateAll(url);
  expect(first.migrated[0]).toBe('202610231700_init');
  expect(first.migrated.length).toBeGreaterThan(1);
  expect(first.queues).toEqual([...QUEUES]);

  db = createDb(createPool(url, 2, undefined, () => undefined));
  boss = createBoss(url, 'api', 2);
  await boss.start();
}, 180_000);

afterAll(async () => {
  // Setup lỗi giữa chừng thì các biến có thể chưa được gán: lỗi nào cũng bỏ qua.
  const steps: (() => Promise<unknown>)[] = [
    () => boss.stop({ graceful: false }),
    () => db.destroy(),
    () => container.stop(),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch {
      // bỏ qua
    }
  }
}, 60_000);

describe('migration', () => {
  it('chạy lần hai không làm gì', async () => {
    const second = await migrateAll(container.getConnectionUri());
    expect(second).toEqual({ migrated: [], queues: [] });
  });

  it('tạo extension citext và schema pgboss', async () => {
    const { rows } = await sql<{ ext: string | null; schema: string | null }>`
      SELECT (SELECT extname FROM pg_extension WHERE extname = 'citext') AS ext,
             (SELECT nspname FROM pg_namespace WHERE nspname = 'pgboss') AS schema`.execute(db);
    expect(rows[0]).toEqual({ ext: 'citext', schema: 'pgboss' });
  });
});

describe('JobQueuePort.enqueue', () => {
  it('rollback thì không có job; commit thì có đúng 1 job', async () => {
    const queue = new PgBossJobQueue(boss);
    const before = await jobCount();

    await expect(
      db.transaction().execute(async (trx) => {
        await queue.enqueue(trx, 'email.transactional', { to: 'rollback@example.com' });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await jobCount()).toBe(before);

    await db.transaction().execute(async (trx) => {
      await queue.enqueue(trx, 'email.transactional', { to: 'commit@example.com' });
    });
    expect(await jobCount()).toBe(before + 1);
  });
});

describe('withUserTx', () => {
  const currentUser = async (q: Kysely<Database>): Promise<string | null> => {
    const { rows } = await sql<{ v: string | null }>`
      SELECT nullif(current_setting('app.user_id', true), '') AS v`.execute(q);
    return rows[0]?.v ?? null;
  };

  it('đặt app.user_id trong transaction; hết transaction thì không còn', async () => {
    const userId = newId();
    const inside = await withUserTx(db, userId, (trx) => currentUser(trx));
    expect(inside).toBe(userId);
    expect(await currentUser(db)).toBeNull();
  });

  it('hai transaction song song không thấy giá trị của nhau', async () => {
    const [a, b] = [newId(), newId()];
    const results = await Promise.all([
      withUserTx(db, a, (trx) => currentUser(trx)),
      withUserTx(db, b, (trx) => currentUser(trx)),
    ]);
    expect(results).toEqual([a, b]);
  });
});

// Chạy cuối cùng: dừng container.
describe('readyz với DB thật', () => {
  it('200 khi DB chạy, 503 khi dừng container', async () => {
    const pool = createPool(container.getConnectionUri(), 1, undefined, () => undefined);
    const probeDb = createDb(pool);
    const app = await buildApp(
      testDeps({
        checkDb: async () => {
          await sql`SELECT 1`.execute(probeDb);
        },
      }),
    );
    expect((await app.inject({ method: 'GET', url: '/api/v1/readyz' })).statusCode).toBe(200);

    await boss.stop({ graceful: false });
    await container.stop({ remove: false });
    expect((await app.inject({ method: 'GET', url: '/api/v1/readyz' })).statusCode).toBe(503);

    await app.close();
    await probeDb.destroy().catch(() => undefined);
  }, 60_000);
});
