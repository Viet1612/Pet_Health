import type { Kysely, Selectable, Transaction } from 'kysely';

import type { Users } from '../../../../platform/db/database.types.js';
import type { Database } from '../../../../platform/db/kysely.js';

export type UserRow = Selectable<Users>;
type Q = Kysely<Database> | Transaction<Database>;

/** Lỗi trùng email (ràng buộc users_email_key). */
export function isEmailTaken(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'users_email_key'
  );
}

/** Mọi truy vấn lọc theo khóa duy nhất (email hoặc id); không có truy vấn liệt kê user. */
export const userRepository = {
  findByEmail(q: Q, email: string): Promise<UserRow | undefined> {
    return q.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();
  },

  findById(q: Q, id: string): Promise<UserRow | undefined> {
    return q.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
  },

  /** `SELECT ... FOR UPDATE` dòng user (đếm đăng nhập sai, giới hạn số thú cưng). */
  lockForUpdate(q: Transaction<Database>, id: string): Promise<UserRow | undefined> {
    return q.selectFrom('users').selectAll().where('id', '=', id).forUpdate().executeTakeFirst();
  },

  async insert(
    q: Q,
    user: {
      id: string;
      email: string;
      passwordHash: string;
      timezone: string;
      locale: string;
      createdAt: Date;
    },
  ): Promise<UserRow> {
    return q
      .insertInto('users')
      .values({
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        timezone: user.timezone,
        locale: user.locale,
        created_at: user.createdAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async setLocale(q: Q, id: string, locale: string): Promise<UserRow | undefined> {
    return q
      .updateTable('users')
      .set({ locale })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  async markEmailVerified(q: Q, id: string, at: Date): Promise<UserRow | undefined> {
    return q
      .updateTable('users')
      .set((eb) => ({ email_verified_at: eb.fn.coalesce('email_verified_at', eb.val(at)) }))
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  /** Đặt mật khẩu mới, mở khóa đăng nhập và xác nhận email (đã chứng minh sở hữu email). */
  async resetPassword(q: Q, id: string, passwordHash: string, now: Date): Promise<void> {
    await q
      .updateTable('users')
      .set((eb) => ({
        password_hash: passwordHash,
        failed_login_count: 0,
        failed_login_window_start: null,
        locked_until: null,
        email_verified_at: eb.fn.coalesce('email_verified_at', eb.val(now)),
      }))
      .where('id', '=', id)
      .execute();
  },

  async updateLoginState(
    q: Q,
    id: string,
    state: {
      failedLoginCount: number;
      failedLoginWindowStart: Date | null;
      lockedUntil: Date | null;
    },
  ): Promise<void> {
    await q
      .updateTable('users')
      .set({
        failed_login_count: state.failedLoginCount,
        failed_login_window_start: state.failedLoginWindowStart,
        locked_until: state.lockedUntil,
      })
      .where('id', '=', id)
      .execute();
  },
};
