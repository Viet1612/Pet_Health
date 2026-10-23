// PostgreSQL 16 (Testcontainers, cần Docker) cho bộ test IDOR: role ứng dụng, migration, bảng thử.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sql, type Kysely } from 'kysely';

import { createDb, createPool, type Database } from '../../src/platform/db/kysely.js';
import { createMigrator } from '../../src/platform/db/migrator.js';
import { createProbeTable } from './probe.js';

export interface IdorDb {
  /** Kết nối `app_rw` (chịu RLS) — app dùng. */
  appDb: Kysely<Database>;
  /** Kết nối `app_worker` (BYPASSRLS) — fixture tạo dữ liệu và chụp snapshot. */
  workerDb: Kysely<Database>;
  /** Kết nối chủ (superuser của container) — meta-test RLS đọc catalog. */
  ownerDb: Kysely<Database>;
  close(): Promise<void>;
}

const quiet = (): void => undefined;

export async function startIdorDb(): Promise<IdorDb> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16',
  ).start();
  const ownerDb = createDb(createPool(container.getConnectionUri(), 2, undefined, quiet));

  // Giống infra/dev/roles.sql, mật khẩu chỉ dùng trong container.
  await sql`CREATE ROLE app_rw LOGIN NOBYPASSRLS PASSWORD 'app_rw_test'`.execute(ownerDb);
  await sql`CREATE ROLE app_worker LOGIN BYPASSRLS PASSWORD 'app_worker_test'`.execute(ownerDb);

  const { error } = await createMigrator(ownerDb).migrateToLatest();
  if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
  await createProbeTable(ownerDb);

  const urlFor = (user: string, password: string): string =>
    `postgres://${user}:${password}@${container.getHost()}:${String(container.getPort())}/${container.getDatabase()}`;
  const appDb = createDb(createPool(urlFor('app_rw', 'app_rw_test'), 4, undefined, quiet));
  const workerDb = createDb(
    createPool(urlFor('app_worker', 'app_worker_test'), 2, undefined, quiet),
  );

  return {
    appDb,
    workerDb,
    ownerDb,
    async close() {
      await Promise.allSettled([appDb.destroy(), workerDb.destroy(), ownerDb.destroy()]);
      await container.stop().catch(() => undefined);
    },
  };
}

const MODULES_DIR = fileURLToPath(new URL('../../src/modules', import.meta.url));

/** Nạp mọi `src/modules/<module>/adapters/http/__idor__/*.idor.ts` (mỗi file tự đăng ký fixture). */
export async function loadModuleFixtures(): Promise<string[]> {
  const loaded: string[] = [];
  for (const mod of await readdir(MODULES_DIR, { withFileTypes: true })) {
    if (!mod.isDirectory()) continue;
    const dir = join(MODULES_DIR, mod.name, 'adapters', 'http', '__idor__');
    const files = await readdir(dir).catch(() => [] as string[]);
    for (const file of files.filter((f) => f.endsWith('.idor.ts')).sort()) {
      await import(pathToFileURL(join(dir, file)).href);
      loaded.push(`${mod.name}/${file}`);
    }
  }
  return loaded;
}
