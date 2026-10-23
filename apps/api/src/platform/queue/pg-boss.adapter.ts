import { CompiledQuery, type Transaction } from 'kysely';
import { PgBoss } from 'pg-boss';

import { APP_SESSION_OPTIONS, type Database } from '../db/kysely.js';
import type { EnqueueOptions, JobQueuePort } from './job-queue.port.js';
import { QUEUES, type QueueName } from './queues.js';

export const PGBOSS_SCHEMA = 'pgboss';
const SEVEN_DAYS = 7 * 24 * 60 * 60;

export type BossRole = 'api' | 'worker' | 'migrate';

/**
 * api chỉ gửi job; worker chạy job và cron; migrate tạo/nâng schema `pgboss`.
 */
export function createBoss(connectionString: string, role: BossRole, max: number): PgBoss {
  return new PgBoss({
    connectionString,
    schema: PGBOSS_SCHEMA,
    max,
    supervise: role === 'worker',
    schedule: role === 'worker',
    migrate: role === 'migrate',
    ...(role === 'migrate' ? {} : { options: APP_SESSION_OPTIONS }),
  });
}

/** Tạo các queue ở `queues.ts` nếu chưa có. Giữ job hoàn thành 7 ngày (SAD §2.3). */
export async function ensureQueues(boss: PgBoss): Promise<QueueName[]> {
  const created: QueueName[] = [];
  for (const name of QUEUES) {
    if (await boss.getQueue(name)) continue;
    await boss.createQueue(name, { deleteAfterSeconds: SEVEN_DAYS });
    created.push(name);
  }
  return created;
}

export class PgBossJobQueue implements JobQueuePort {
  constructor(private readonly boss: PgBoss) {}

  async enqueue(
    trx: Transaction<Database>,
    queue: QueueName,
    data: object,
    opts: EnqueueOptions = {},
  ): Promise<string> {
    const id = await this.boss.send(queue, data, {
      ...opts,
      db: {
        executeSql: async (text: string, values?: unknown[]) => {
          const result = await trx.executeQuery(CompiledQuery.raw(text, values ?? []));
          return { rows: result.rows };
        },
      },
    });
    if (id === null) {
      throw new Error(`pg-boss không tạo job cho queue ${queue}`);
    }
    return id;
  }
}
