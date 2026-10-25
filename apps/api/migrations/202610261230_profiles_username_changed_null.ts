import { sql, type Kysely } from 'kysely';

// F-02: `username_changed_at` NULL = chưa đổi username lần nào (lần đổi đầu không phải chờ). So
// với `created_at` thì sai khi tạo và đổi trong cùng một thời điểm.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE profiles ALTER COLUMN username_changed_at DROP NOT NULL`.execute(db);
  await sql`
    UPDATE profiles SET username_changed_at = NULL
    WHERE username_changed_at = created_at`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE profiles SET username_changed_at = created_at
    WHERE username_changed_at IS NULL`.execute(db);
  await sql`ALTER TABLE profiles ALTER COLUMN username_changed_at SET NOT NULL`.execute(db);
}
