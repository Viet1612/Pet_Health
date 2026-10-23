import { sql, type Kysely } from 'kysely';
import type pg from 'pg';
import type { PgBoss } from 'pg-boss';

import type { Config } from './config.js';
import { createDb, createPool, type Database } from './platform/db/kysely.js';
import type { JobQueuePort } from './platform/queue/job-queue.port.js';
import { createBoss, PgBossJobQueue, type BossRole } from './platform/queue/pg-boss.adapter.js';

export interface Runtime {
  pool: pg.Pool;
  db: Kysely<Database>;
  boss: PgBoss;
  jobQueue: JobQueuePort;
  checkDb: () => Promise<void>;
  /** Dừng pg-boss (chờ job đang chạy) rồi đóng pool DB. */
  close: () => Promise<void>;
}

/** Tạo db, pg-boss và các port rồi trả về để tiêm vào use case. */
export async function createRuntime(
  config: Config,
  role: Exclude<BossRole, 'migrate'>,
): Promise<Runtime> {
  const url = role === 'api' ? config.DATABASE_URL : config.WORKER_DATABASE_URL;
  const max = role === 'api' ? config.DB_POOL_MAX : config.WORKER_DB_POOL_MAX;

  const pool = createPool(url, max);
  const db = createDb(pool);
  const boss = createBoss(url, role, 2);
  boss.on('error', (error: unknown) => {
    process.stderr.write(`[pg-boss] ${String(error)}\n`);
  });
  await boss.start();

  return {
    pool,
    db,
    boss,
    jobQueue: new PgBossJobQueue(boss),
    checkDb: async () => {
      await sql`SELECT 1`.execute(db);
    },
    close: async () => {
      await boss.stop({ graceful: true, timeout: 15_000 });
      await db.destroy();
    },
  };
}
