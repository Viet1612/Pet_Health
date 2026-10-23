import type { Transaction } from 'kysely';

import type { Database } from '../db/kysely.js';
import type { QueueName } from './queues.js';

export interface EnqueueOptions {
  singletonKey?: string;
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
}

export interface JobQueuePort {
  /** Ghi job trong cùng transaction `trx`: rollback thì không có job (AD-006). */
  enqueue(
    trx: Transaction<Database>,
    queue: QueueName,
    data: object,
    opts?: EnqueueOptions,
  ): Promise<string>;
}
