// Job maintenance.daily (S6-06) trên PostgreSQL 16 thật (Testcontainers, cần Docker): biên lưu giữ
// từng bảng, upload bỏ dở, tệp mồ côi, partition analytics, chạy lặp không lỗi.
import { mkdir, mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sql, type Kysely } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FakeClock } from '../src/platform/clock/clock.js';
import { createDb, createPool, type Database } from '../src/platform/db/kysely.js';
import { createMigrator } from '../src/platform/db/migrator.js';
import { newId } from '../src/platform/ids.js';
import { runMaintenance } from '../src/platform/maintenance/maintenance-daily.job.js';
import { LocalDiskStorage } from '../src/platform/storage/local-disk-storage.js';

let container: StartedPostgreSqlContainer | undefined;
let db: Kysely<Database>;
let root: string;

const NOW = new Date('2026-11-14T20:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const H = 3_600_000;
const D = 24 * H;
const count = async (table: string) =>
  Number(
    (await sql<{ n: string }>`SELECT count(*)::text AS n FROM ${sql.table(table)}`.execute(db))
      .rows[0]?.n,
  );

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  const url = container.getConnectionUri();
  const admin = createDb(createPool(url, 1, undefined));
  await sql`CREATE ROLE app_rw LOGIN NOBYPASSRLS PASSWORD 'app_rw_test'`.execute(admin);
  await sql`CREATE ROLE app_worker LOGIN BYPASSRLS PASSWORD 'app_worker_test'`.execute(admin);
  const { error } = await createMigrator(admin).migrateToLatest();
  if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
  await admin.destroy();
  db = createDb(createPool(url, 2, undefined, () => undefined));
  root = await mkdtemp(join(tmpdir(), 'ph-maint-'));
}, 180_000);

afterAll(async () => {
  const steps: (() => Promise<unknown>)[] = [
    () => db.destroy(),
    () => container?.stop() ?? Promise.resolve(),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch {
      // bỏ qua
    }
  }
}, 60_000);

describe('maintenance.daily', () => {
  it('xóa đúng biên, xử lý upload bỏ dở, giữ partition 13 tháng, chạy lặp không lỗi', async () => {
    const userId = newId();
    const petId = newId();
    const milestoneId = newId();
    const visitId = newId();
    await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, 'm@x.vn', 'h')`.execute(
      db,
    );
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${petId}, ${userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    await sql`
      INSERT INTO milestones (id, owner_id, pet_id, type, due_on, due_set_on, origin, created_at, updated_at)
      VALUES (${milestoneId}, ${userId}, ${petId}, 'VACCINE', '2026-08-01', '2026-07-01', 'MANUAL', now(), now())`.execute(
      db,
    );
    // Thông báo: appear_on = hôm nay − 91 (xóa) và − 89 (giữ). Hôm nay UTC = 2026-11-14.
    for (const [level, appear] of [
      ['D7', '2026-08-15'],
      ['D1', '2026-08-17'],
    ] as const) {
      await sql`
        INSERT INTO notifications (id, owner_id, milestone_id, level, due_on_snapshot, appear_on, created_at)
        VALUES (${newId()}, ${userId}, ${milestoneId}, ${level}, '2026-08-01', ${appear}, now())`.execute(
        db,
      );
    }
    // Idempotency 25 h / 23 h; phiên hết hạn / còn hạn; token hết hạn 8 / 6 ngày; rate limit.
    for (const at of [ago(25 * H), ago(23 * H)]) {
      await sql`
        INSERT INTO idempotency_keys (owner_id, key, request_hash, status_code, response_body, created_at)
        VALUES (${userId}, ${newId()}, '\\x00', 201, '{}', ${at})`.execute(db);
    }
    for (const exp of [ago(H), new Date(NOW.getTime() + D)]) {
      await sql`
        INSERT INTO sessions (id, user_id, token_hash, csrf_secret, created_at, last_seen_at, expires_at)
        VALUES (${newId()}, ${userId}, ${Buffer.from(newId())}, ${Buffer.from('s')}, ${ago(D)}, ${ago(D)}, ${exp})`.execute(
        db,
      );
    }
    for (const [kind, exp] of [
      ['VERIFY_EMAIL', ago(8 * D)],
      ['RESET_PASSWORD', ago(6 * D)],
    ] as const) {
      await sql`
        INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, created_at)
        VALUES (${newId()}, ${userId}, ${kind}, ${Buffer.from(newId())}, ${exp}, ${ago(10 * D)})`.execute(
        db,
      );
    }
    for (const at of [ago(25 * H), ago(H)]) {
      await sql`
        INSERT INTO rate_limits (bucket, window_start, count) VALUES (${newId()}, ${at}, 1)`.execute(
        db,
      );
    }
    // Upload PROCESSING 25 h trước (bỏ dở) và 2 h trước (đang xử lý), cùng ảnh khám liên quan.
    await sql`
      INSERT INTO visits (id, owner_id, pet_id, visited_on, symptoms, created_at, updated_at)
      VALUES (${visitId}, ${userId}, ${petId}, '2026-11-01', 'Ho', now(), now())`.execute(db);
    const storage = new LocalDiskStorage(root);
    await mkdir(join(root, 'incoming'), { recursive: true });
    const uploads: { id: string; photo: string; at: Date }[] = [
      { id: newId(), photo: newId(), at: ago(25 * H) },
      { id: newId(), photo: newId(), at: ago(2 * H) },
    ];
    for (const u of uploads) {
      await writeFile(join(root, 'incoming', u.id), 'x');
      await sql`
        INSERT INTO visit_photos (id, owner_id, visit_id, storage_key, thumb_key)
        VALUES (${u.photo}, ${userId}, ${visitId}, 'k', 't')`.execute(db);
      await sql`
        INSERT INTO uploads (id, owner_id, target_kind, target_id, incoming_key, created_at)
        VALUES (${u.id}, ${userId}, 'VISIT_PHOTO', ${u.photo}, ${`incoming/${u.id}`}, ${u.at})`.execute(
        db,
      );
    }
    // Tệp mồ côi cũ (xóa) và mới (giữ).
    const orphanOld = join(root, 'incoming', 'orphan-old');
    await writeFile(orphanOld, 'x');
    await utimes(orphanOld, ago(2 * D), ago(2 * D));
    const orphanNew = join(root, 'incoming', 'orphan-new');
    await writeFile(orphanNew, 'x');
    // Thời điểm theo đồng hồ giả (NOW), không theo giờ thật của máy.
    await utimes(orphanNew, ago(H), ago(H));
    // Partition quá 13 tháng.
    await sql`
      CREATE TABLE analytics_events_202501 PARTITION OF analytics_events
      FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')`.execute(db);

    const clock = new FakeClock();
    clock.set(NOW, { frozen: true });
    const deps = { db, clock, storage, logger: pino({ level: 'silent' }) };
    const first = await runMaintenance(deps);

    expect(first).toMatchObject({
      notifications: 1,
      idempotency_keys: 1,
      sessions: 1,
      auth_tokens: 1,
      rate_limits: 1,
      uploads: 1,
      incoming_orphans: 1,
      analytics_partitions: 1,
    });
    expect(await count('notifications')).toBe(1);
    expect(await count('uploads')).toBe(1);
    const photos = (
      await sql<{ id: string; status: string; fail_reason: string | null }>`
        SELECT id, status, fail_reason FROM visit_photos`.execute(db)
    ).rows;
    expect(photos.find((p) => p.id === uploads[0]?.photo)).toMatchObject({
      status: 'FAILED',
      fail_reason: 'ABANDONED',
    });
    expect(photos.find((p) => p.id === uploads[1]?.photo)?.status).toBe('PROCESSING');
    const files = (await storage.list('incoming/')).map((f) => f.key).sort();
    expect(files).toEqual([`incoming/${uploads[1]?.id ?? ''}`, 'incoming/orphan-new'].sort());
    const parts = (
      await sql<{ relname: string }>`
        SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'analytics_events'`.execute(db)
    ).rows.map((r) => r.relname);
    expect(parts).not.toContain('analytics_events_202501');
    // Partition mới tạo theo giờ thật của DB (now()), không theo FakeClock.
    expect(parts.length).toBeGreaterThanOrEqual(3);

    const second = await runMaintenance(deps);
    expect(Object.values(second).every((n) => n === 0)).toBe(true);
  }, 120_000);
});
