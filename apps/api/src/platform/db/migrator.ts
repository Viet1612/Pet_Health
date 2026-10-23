import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Kysely } from 'kysely';
import { Migrator, type Migration, type MigrationProvider } from 'kysely/migration';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../../migrations/', import.meta.url));

const MIGRATION_FILE = /^\d{12}_[a-z0-9_]+\.(ts|js)$/;

/**
 * Đọc migration từ thư mục. Thay cho FileMigrationProvider của Kysely vì `import()` trên Windows
 * cần file URL, không nhận đường dẫn tuyệt đối.
 */
export class FolderMigrationProvider implements MigrationProvider {
  constructor(private readonly folder: string = MIGRATIONS_DIR) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const files = (await readdir(this.folder)).filter((f) => MIGRATION_FILE.test(f)).sort();
    const migrations: Record<string, Migration> = {};
    for (const file of files) {
      const mod = (await import(pathToFileURL(path.join(this.folder, file)).href)) as Migration;
      migrations[file.replace(/\.(ts|js)$/, '')] = mod;
    }
    return migrations;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Migrator chạy trên mọi schema
export function createMigrator(db: Kysely<any>, folder?: string): Migrator {
  return new Migrator({ db, provider: new FolderMigrationProvider(folder) });
}
