import { sql, type Kysely } from 'kysely';

// Xóa tài khoản (S6-01): mọi bảng có chủ phải cascade theo `users`. `idempotency_keys` (S0-05) có
// `owner_id` nhưng chưa có FK; dọn dòng mồ côi rồi thêm FK.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM idempotency_keys k
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = k.owner_id)`.execute(db);
  await sql`
    ALTER TABLE idempotency_keys
      ADD CONSTRAINT idempotency_keys_owner_fk
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_owner_fk`.execute(db);
}
