import { sql, type Kysely } from 'kysely';

// Ngôn ngữ giao diện và email theo tài khoản (S4-09). Mặc định tiếng Việt.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE users
      ADD COLUMN locale text NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en'))`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE users DROP COLUMN locale`.execute(db);
}
