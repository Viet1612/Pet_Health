import { loadConfigOrExit } from './config.js';
import { createDb, createPool } from './platform/db/kysely.js';
import { createMigrator } from './platform/db/migrator.js';
import { createBoss, ensureQueues } from './platform/queue/pg-boss.adapter.js';

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
await db.destroy();

// Tạo/nâng schema pgboss và tạo queue còn thiếu.
const boss = createBoss(config.MIGRATION_DATABASE_URL, 'migrate', 1);
await boss.start();
const created = await ensureQueues(boss);
out(`[pg-boss] queue mới: ${created.length ? created.join(', ') : 'không có'}`);
await boss.stop({ graceful: false });
process.exit(0);
