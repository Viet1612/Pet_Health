import type { Kysely, Transaction } from 'kysely';

import type { Database } from '../../../../platform/db/kysely.js';
import type { UserRow } from './user-repository.js';

type Q = Kysely<Database> | Transaction<Database>;

export interface SessionWithUser {
  sessionId: string;
  csrfSecret: Buffer | null;
  lastSeenAt: Date;
  expiresAt: Date;
  user: UserRow;
}

export const sessionRepository = {
  async insert(
    q: Q,
    row: {
      id: string;
      userId: string;
      tokenHash: Buffer;
      csrfSecret: Buffer;
      now: Date;
      expiresAt: Date;
    },
  ): Promise<void> {
    await q
      .insertInto('sessions')
      .values({
        id: row.id,
        user_id: row.userId,
        token_hash: row.tokenHash,
        client_type: 'web',
        csrf_secret: row.csrfSecret,
        last_seen_at: row.now,
        expires_at: row.expiresAt,
        created_at: row.now,
      })
      .execute();
  },

  /** Phiên còn hạn theo hash token, kèm user (một truy vấn). */
  async findValidByTokenHash(
    q: Q,
    tokenHash: Buffer,
    now: Date,
  ): Promise<SessionWithUser | undefined> {
    const row = await q
      .selectFrom('sessions as s')
      .innerJoin('users as u', 'u.id', 's.user_id')
      .select([
        's.id as session_id',
        's.csrf_secret',
        's.last_seen_at',
        's.expires_at',
        'u.id',
        'u.email',
        'u.password_hash',
        'u.email_verified_at',
        'u.timezone',
        'u.locale',
        'u.notifications_synced_on',
        'u.failed_login_count',
        'u.failed_login_window_start',
        'u.locked_until',
        'u.created_at',
      ])
      .where('s.token_hash', '=', tokenHash)
      .where('s.expires_at', '>', now)
      .executeTakeFirst();
    if (!row) return undefined;
    const { session_id, csrf_secret, last_seen_at, expires_at, ...user } = row;
    return {
      sessionId: session_id,
      csrfSecret: csrf_secret,
      lastSeenAt: last_seen_at,
      expiresAt: expires_at,
      user,
    };
  },

  /** Gia hạn trượt (SD-003). */
  async touch(q: Q, id: string, now: Date, expiresAt: Date): Promise<void> {
    await q
      .updateTable('sessions')
      .set({ last_seen_at: now, expires_at: expiresAt })
      .where('id', '=', id)
      .execute();
  },

  async deleteById(q: Q, id: string): Promise<void> {
    await q.deleteFrom('sessions').where('id', '=', id).execute();
  },

  /** Hủy mọi phiên của user, trừ `exceptId` nếu có (FR-AUTH-009). */
  async deleteAllForUser(q: Q, userId: string, exceptId?: string): Promise<void> {
    let query = q.deleteFrom('sessions').where('user_id', '=', userId);
    if (exceptId) query = query.where('id', '<>', exceptId);
    await query.execute();
  },
};
