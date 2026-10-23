import { sql, type Kysely } from 'kysely';

// Quyền cho role ứng dụng (S1-01). Role được tạo trước bằng script có mật khẩu
// (infra/postgres/init/01-roles.sh cho Docker, infra/dev/roles.sql cho DB ServBay), vì tạo role
// BYPASSRLS cần superuser và migration không giữ mật khẩu. Quyền trên schema pgboss cấp ở
// main-migrate.ts sau khi pg-boss tạo schema.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_rw')
         OR NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_worker') THEN
        RAISE EXCEPTION 'Thiếu role app_rw/app_worker. Chạy infra/dev/roles.sql (dev) hoặc infra/postgres/init/01-roles.sh trước khi migrate.';
      END IF;
    END
    $$`.execute(db);

  await sql`GRANT USAGE ON SCHEMA public TO app_rw, app_worker`.execute(db);
  await sql`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw, app_worker`.execute(db);
  // Bảng đã tạo trước migration này (idempotency_keys, rate_limits).
  await sql`
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw, app_worker`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM app_rw, app_worker`.execute(db);
  await sql`
    REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM app_rw, app_worker`.execute(
    db,
  );
}
