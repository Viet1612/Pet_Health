import { sql, type Kysely } from 'kysely';

// F-02: ngày sinh người dùng khi đăng ký. Tài khoản cũ để NULL (hỏi bổ sung cùng nickname).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE users ADD COLUMN birth_date date NULL
      CHECK (birth_date IS NULL OR birth_date >= DATE '1900-01-01')`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE users DROP COLUMN birth_date`.execute(db);
}
