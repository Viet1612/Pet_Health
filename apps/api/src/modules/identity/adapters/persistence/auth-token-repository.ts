import type { Kysely, Selectable, Transaction } from 'kysely';

import type { AuthTokens } from '../../../../platform/db/database.types.js';
import type { Database } from '../../../../platform/db/kysely.js';

export type AuthTokenKind = 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_EMAIL';
export type AuthTokenRow = Selectable<AuthTokens>;
type Q = Kysely<Database> | Transaction<Database>;

export const authTokenRepository = {
  /**
   * Thay token chưa dùng cùng loại của user bằng token mới (xóa cũ + chèn mới, trong cùng
   * transaction) — giữ ràng buộc "mỗi loại 1 token chưa dùng" và vô hiệu liên kết cũ (FR-AUTH-003).
   */
  async replaceActive(
    q: Transaction<Database>,
    row: {
      id: string;
      userId: string;
      kind: AuthTokenKind;
      tokenHash: Buffer;
      expiresAt: Date;
      now: Date;
      payload?: Record<string, string>;
    },
  ): Promise<void> {
    await q
      .deleteFrom('auth_tokens')
      .where('user_id', '=', row.userId)
      .where('kind', '=', row.kind)
      .where('used_at', 'is', null)
      .execute();
    await q
      .insertInto('auth_tokens')
      .values({
        id: row.id,
        user_id: row.userId,
        kind: row.kind,
        token_hash: row.tokenHash,
        payload: row.payload ? JSON.stringify(row.payload) : null,
        expires_at: row.expiresAt,
        created_at: row.now,
      })
      .execute();
  },

  findByHash(q: Q, tokenHash: Buffer): Promise<AuthTokenRow | undefined> {
    return q
      .selectFrom('auth_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();
  },

  /** Token chưa dùng, chưa hết hạn của user theo loại (đổi email đang chờ, S6-01). */
  findActive(
    q: Q,
    userId: string,
    kind: AuthTokenKind,
    now: Date,
  ): Promise<AuthTokenRow | undefined> {
    return q
      .selectFrom('auth_tokens')
      .selectAll()
      .where('user_id', '=', userId)
      .where('kind', '=', kind)
      .where('used_at', 'is', null)
      .where('expires_at', '>', now)
      .executeTakeFirst();
  },

  /** Vô hiệu token chưa dùng cùng loại (đổi mật khẩu → liên kết đặt lại cũ hết hiệu lực). */
  async useAll(q: Q, userId: string, kind: AuthTokenKind, now: Date): Promise<void> {
    await q
      .updateTable('auth_tokens')
      .set({ used_at: now })
      .where('user_id', '=', userId)
      .where('kind', '=', kind)
      .where('used_at', 'is', null)
      .execute();
  },

  /** Đánh dấu đã dùng; trả `false` nếu token đã bị dùng (kể cả bởi request song song). */
  async consume(q: Q, id: string, now: Date): Promise<boolean> {
    const row = await q
      .updateTable('auth_tokens')
      .set({ used_at: now })
      .where('id', '=', id)
      .where('used_at', 'is', null)
      .returning('id')
      .executeTakeFirst();
    return row !== undefined;
  },
};
