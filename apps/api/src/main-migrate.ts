import { sql } from 'kysely';

import { loadConfigOrExit } from './config.js';
import { createDb, createPool } from './platform/db/kysely.js';
import { createMigrator } from './platform/db/migrator.js';
import { createBoss, ensureQueues, PGBOSS_SCHEMA } from './platform/queue/pg-boss.adapter.js';

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const config = loadConfigOrExit();

// Migration không đặt statement_timeout (có thể chạy lâu hơn 5 s).
const db = createDb(createPool(config.MIGRATION_DATABASE_URL, 1, undefined));
const { error, results } = await createMigrator(db).migrateToLatest();

for (const r of results ?? []) {
  out(`[migrate] ${r.migrationName}: ${r.status}`);
}
if (error) {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  process.stderr.write(`[migrate] lỗi: ${message}\n`);
  await db.destroy();
  process.exit(1);
}
if (!results?.length) out('[migrate] không có migration mới');

// Tạo/nâng schema pgboss và tạo/cập nhật queue.
const boss = createBoss(config.MIGRATION_DATABASE_URL, 'migrate', 1);
await boss.start();
const created = await ensureQueues(boss);
out(`[pg-boss] queue mới: ${created.length ? created.join(', ') : 'không có'}`);
await boss.stop({ graceful: false });

// api và worker cần đọc/ghi bảng của pg-boss (gửi và chạy job), kể cả bảng partition tạo về sau.
const schema = sql.id(PGBOSS_SCHEMA);
await sql`GRANT USAGE ON SCHEMA ${schema} TO app_rw, app_worker`.execute(db);
await sql`
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO app_rw, app_worker`.execute(
  db,
);
await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO app_rw, app_worker`.execute(
  db,
);
await sql`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${schema} TO app_rw, app_worker`.execute(db);
await sql`
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw, app_worker`.execute(db);
out('[pg-boss] đã cấp quyền cho app_rw, app_worker');

await db.destroy();
process.exit(0);
