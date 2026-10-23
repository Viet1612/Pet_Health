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

const DEFAULT_QUEUE_OPTIONS = { deleteAfterSeconds: SEVEN_DAYS };

/**
 * Tùy chọn riêng từng queue (SAD §2.2.4). Email: thử lại 5 lần, chờ 30 s × 2ⁿ; job xong xóa sau
 * 1 ngày (không giữ 7 ngày) vì payload có token.
 */
const QUEUE_OPTIONS: Partial<Record<QueueName, Record<string, number | boolean>>> = {
  'email.transactional': {
    retryLimit: 5,
    retryDelay: 30,
    retryBackoff: true,
    deleteAfterSeconds: 86_400,
  },
  'media.process': { retryLimit: 3, deleteAfterSeconds: SEVEN_DAYS },
  'media.purge-prefix': { retryLimit: 10, deleteAfterSeconds: SEVEN_DAYS },
  'maintenance.daily': { retryLimit: 3, deleteAfterSeconds: SEVEN_DAYS },
};

/** Tạo queue còn thiếu và cập nhật tùy chọn queue đã có. Trả tên queue mới tạo. */
export async function ensureQueues(boss: PgBoss): Promise<QueueName[]> {
  const created: QueueName[] = [];
  for (const name of QUEUES) {
    const options = QUEUE_OPTIONS[name] ?? DEFAULT_QUEUE_OPTIONS;
    if (await boss.getQueue(name)) {
      await boss.updateQueue(name, options);
      continue;
    }
    await boss.createQueue(name, options);
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
