import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';
import { z } from 'zod';

import type { Database } from '../db/kysely.js';
import { withRetryOnConflict } from '../db/retry.js';
import { withUserTx } from '../db/with-user-tx.js';
import { UnauthenticatedError } from '../errors/app-error.js';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Chạy `fn` trong transaction đã đặt `app.user_id` của phiên (RLS, SAD §3.1.2); thử lại 1 lần
     * khi lỗi serialization/deadlock. Chỉ dùng ở route có phiên.
     */
    withTx<T>(fn: (trx: Transaction<Database>) => Promise<T>): Promise<T>;
  }
}

/** Path param dạng UUID dùng chung. */
export const zUuid = z.uuid();

export function registerUserTx(app: FastifyInstance, db: Kysely<Database> | undefined): void {
  app.decorateRequest('withTx', function <
    T,
  >(this: { auth?: { userId: string } }, fn: (trx: Transaction<Database>) => Promise<T>): Promise<T> {
    if (!db) throw new Error('withTx: app chưa được cấp db');
    const userId = this.auth?.userId;
    if (!userId) throw new UnauthenticatedError();
    return withRetryOnConflict(() => withUserTx(db, userId, fn));
  });
}
