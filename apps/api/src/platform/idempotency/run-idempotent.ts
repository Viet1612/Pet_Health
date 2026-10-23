import type { FastifyReply } from 'fastify';
import type { Transaction } from 'kysely';

import type { Database } from '../db/kysely.js';
import { AppError } from '../errors/app-error.js';

const TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyInput {
  ownerId: string;
  key: string;
  requestHash: Buffer;
  now: Date;
}

export interface IdempotentResult {
  status: number;
  body: unknown;
  replayed: boolean;
}

/**
 * Chạy `handler` đúng một lần cho mỗi (ownerId, key) trong 24 giờ (FR-GEN-005). Gọi bên trong
 * transaction nghiệp vụ (withUserTx): handler lỗi thì transaction rollback, dòng khóa biến mất,
 * lần "Thử lại" chạy lại từ đầu. Chỉ phản hồi 2xx được lưu.
 */
export async function runIdempotent(
  trx: Transaction<Database>,
  input: IdempotencyInput,
  handler: () => Promise<{ status: number; body: unknown }>,
): Promise<IdempotentResult> {
  const { ownerId, key, requestHash, now } = input;

  // Khóa quá 24 giờ coi như mới.
  await trx
    .deleteFrom('idempotency_keys')
    .where('owner_id', '=', ownerId)
    .where('key', '=', key)
    .where('created_at', '<', new Date(now.getTime() - TTL_MS))
    .execute();

  // Có request song song cùng khóa thì câu này chờ transaction kia kết thúc.
  const inserted = await trx
    .insertInto('idempotency_keys')
    .values({ owner_id: ownerId, key, request_hash: requestHash, created_at: now })
    .onConflict((oc) => oc.doNothing())
    .returning('key')
    .executeTakeFirst();

  if (!inserted) {
    const existing = await trx
      .selectFrom('idempotency_keys')
      .select(['request_hash', 'status_code', 'response_body'])
      .where('owner_id', '=', ownerId)
      .where('key', '=', key)
      .executeTakeFirstOrThrow();
    if (!existing.request_hash.equals(requestHash) || existing.status_code === null) {
      throw new AppError(
        422,
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency-Key đã được dùng cho một yêu cầu khác',
      );
    }
    return { status: existing.status_code, body: existing.response_body, replayed: true };
  }

  const result = await handler();
  await trx
    .updateTable('idempotency_keys')
    .set({ status_code: result.status, response_body: JSON.stringify(result.body) })
    .where('owner_id', '=', ownerId)
    .where('key', '=', key)
    .execute();
  return { ...result, replayed: false };
}

/** Gửi kết quả; phản hồi phát lại có header `Idempotency-Replayed: true`. */
export function sendIdempotent(reply: FastifyReply, result: IdempotentResult): FastifyReply {
  if (result.replayed) void reply.header('idempotency-replayed', 'true');
  return reply.code(result.status).send(result.body);
}
