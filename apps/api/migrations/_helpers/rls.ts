import { sql, type Kysely } from 'kysely';

/**
 * Bật Row-Level Security theo chủ sở hữu (AD-011, SAD §3.1.2). Bắt buộc cho mọi bảng có `owner_id`;
 * meta-test ở S1-08 bắt lỗi quên gọi.
 * - `NULLIF(..., '')` + `missing_ok = true`: thiếu `app.user_id` thì thấy 0 dòng thay vì lỗi cast.
 * - `FORCE`: chính chủ bảng (`app_owner`) cũng bị chặn nếu lỡ chạy app bằng role này.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration chạy trên mọi schema
export async function enableOwnerRls(db: Kysely<any>, table: string): Promise<void> {
  await sql`ALTER TABLE ${sql.table(table)} ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ${sql.table(table)} FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY owner_isolation ON ${sql.table(table)}
      USING (owner_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
      WITH CHECK (owner_id = NULLIF(current_setting('app.user_id', true), '')::uuid)`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration chạy trên mọi schema
export async function disableOwnerRls(db: Kysely<any>, table: string): Promise<void> {
  await sql`DROP POLICY IF EXISTS owner_isolation ON ${sql.table(table)}`.execute(db);
  await sql`ALTER TABLE ${sql.table(table)} NO FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ${sql.table(table)} DISABLE ROW LEVEL SECURITY`.execute(db);
}
