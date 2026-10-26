import { sql, type Kysely, type RawBuilder } from 'kysely';
import type { Logger } from 'pino';

import type { ClockPort } from '../clock/clock.js';
import type { Database } from '../db/kysely.js';
import type { ObjectStoragePort } from '../storage/object-storage.port.js';

// Dọn dẹp hằng đêm theo chính sách lưu giữ (S6-06, SAD §2.3). Chạy bằng `app_worker` (BYPASSRLS),
// "bây giờ" lấy từ ClockPort. Mỗi bước độc lập, idempotent, xóa theo lô 5.000 dòng.

const BATCH = 5_000;
const DAY_MS = 86_400_000;

export interface MaintenanceDeps {
  db: Kysely<Database>;
  clock: ClockPort;
  storage: ObjectStoragePort;
  logger: Logger;
}

/** Xóa theo lô tới khi hết: `DELETE ... WHERE ctid IN (SELECT ctid ... LIMIT 5000)`. */
async function deleteInBatches(
  db: Kysely<Database>,
  table: string,
  where: RawBuilder<unknown>,
): Promise<number> {
  let total = 0;
  for (;;) {
    const n = await db.transaction().execute(async (trx) => {
      await sql`SET LOCAL statement_timeout = '30s'`.execute(trx);
      const res = await sql`
        DELETE FROM ${sql.table(table)} WHERE ctid IN (
          SELECT ctid FROM ${sql.table(table)} WHERE ${where} LIMIT ${BATCH})`.execute(trx);
      return Number(res.numAffectedRows ?? 0);
    });
    total += n;
    if (n < BATCH) return total;
  }
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

type Step = (deps: MaintenanceDeps, now: Date) => Promise<number>;

export const STEPS: Record<string, Step> = {
  /** Thông báo hơn 90 ngày (FR-NTF-011, SD-013). */
  notifications: ({ db }, now) =>
    deleteInBatches(
      db,
      'notifications',
      sql`appear_on < ${isoDate(new Date(now.getTime() - 90 * DAY_MS))}::date`,
    ),
  /** Thông báo hoạt động (F-11) hơn 90 ngày. */
  social_notifications: ({ db }, now) =>
    deleteInBatches(
      db,
      'social_notifications',
      sql`created_at < ${new Date(now.getTime() - 90 * DAY_MS)}`,
    ),
  idempotency_keys: ({ db }, now) =>
    deleteInBatches(db, 'idempotency_keys', sql`created_at < ${new Date(now.getTime() - DAY_MS)}`),
  sessions: ({ db }, now) => deleteInBatches(db, 'sessions', sql`expires_at < ${now}`),
  auth_tokens: ({ db }, now) =>
    deleteInBatches(db, 'auth_tokens', sql`expires_at < ${new Date(now.getTime() - 7 * DAY_MS)}`),
  rate_limits: ({ db }, now) =>
    deleteInBatches(db, 'rate_limits', sql`window_start < ${new Date(now.getTime() - DAY_MS)}`),

  /**
   * Upload hơn 1 ngày: chưa READY → xóa tệp `incoming/`, ảnh khám liên quan thành FAILED
   * (`ABANDONED`); rồi xóa dòng `uploads`.
   */
  uploads: async ({ db, storage }, now) => {
    const cutoff = new Date(now.getTime() - DAY_MS);
    let total = 0;
    for (;;) {
      const rows = await db
        .selectFrom('uploads')
        .select(['id', 'status', 'incoming_key', 'target_kind', 'target_id'])
        .where('created_at', '<', cutoff)
        .limit(BATCH)
        .execute();
      if (rows.length === 0) return total;
      for (const r of rows.filter((x) => x.status !== 'READY')) {
        await storage.delete(r.incoming_key);
      }
      const photoIds = rows
        .filter((r) => r.status !== 'READY' && r.target_kind === 'VISIT_PHOTO')
        .map((r) => r.target_id);
      await db.transaction().execute(async (trx) => {
        if (photoIds.length > 0) {
          await trx
            .updateTable('visit_photos')
            .set({ status: 'FAILED', fail_reason: 'ABANDONED' })
            .where('id', 'in', photoIds)
            .where('status', '<>', 'READY')
            .execute();
        }
        await trx
          .deleteFrom('uploads')
          .where(
            'id',
            'in',
            rows.map((r) => r.id),
          )
          .execute();
      });
      total += rows.length;
      if (rows.length < BATCH) return total;
    }
  },

  /** Bài nháp (F-04) hơn 24 giờ: xóa tệp ảnh đã xử lý rồi xóa bài (ảnh theo CASCADE). */
  post_drafts: async ({ db, storage }, now) => {
    const cutoff = new Date(now.getTime() - DAY_MS);
    let total = 0;
    for (;;) {
      const posts = await db
        .selectFrom('posts')
        .select('id')
        .where('status', '=', 'DRAFT')
        .where('created_at', '<', cutoff)
        .limit(BATCH)
        .execute();
      if (posts.length === 0) return total;
      const ids = posts.map((p) => p.id);
      const photos = await db
        .selectFrom('post_photos')
        .select(['storage_key', 'thumb_key'])
        .where('post_id', 'in', ids)
        .execute();
      for (const ph of photos) {
        if (ph.storage_key) await storage.delete(ph.storage_key);
        if (ph.thumb_key) await storage.delete(ph.thumb_key);
      }
      await db.deleteFrom('posts').where('id', 'in', ids).where('status', '=', 'DRAFT').execute();
      total += posts.length;
      if (posts.length < BATCH) return total;
    }
  },

  /** Tệp `incoming/` hơn 1 ngày không còn dòng `uploads` tương ứng. */
  incoming_orphans: async ({ db, storage }, now) => {
    const cutoff = now.getTime() - DAY_MS;
    const old = (await storage.list('incoming/')).filter((f) => f.modifiedAt.getTime() < cutoff);
    if (old.length === 0) return 0;
    const known = new Set(
      (
        await db
          .selectFrom('uploads')
          .select('incoming_key')
          .where(
            'incoming_key',
            'in',
            old.map((f) => f.key),
          )
          .execute()
      ).map((r) => r.incoming_key),
    );
    const orphans = old.filter((f) => !known.has(f.key));
    for (const f of orphans) await storage.delete(f.key);
    return orphans.length;
  },

  /** Partition analytics: luôn có tháng này + 2 tháng tới; giữ 13 tháng kể cả tháng hiện tại. */
  analytics_partitions: async ({ db }, now) => {
    await sql`SELECT analytics_ensure_partitions(2)`.execute(db);
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, 1));
    const { rows } = await sql<{ dropped: number }>`
      SELECT analytics_drop_partitions_before(${isoDate(cutoff)}::date) AS dropped`.execute(db);
    return rows[0]?.dropped ?? 0;
  },
};

/**
 * Chạy mọi bước; bước lỗi → log `error` và chạy tiếp; cuối cùng ném lỗi nếu có bước lỗi để pg-boss
 * retry (bước đã xong chạy lại không hại). Không log nội dung dòng.
 */
export async function runMaintenance(deps: MaintenanceDeps): Promise<Record<string, number>> {
  const now = deps.clock.now();
  const result: Record<string, number> = {};
  const failed: string[] = [];
  for (const [step, run] of Object.entries(STEPS)) {
    const started = Date.now();
    try {
      result[step] = await run(deps, now);
      deps.logger.info(
        { job: 'maintenance.daily', step, deleted: result[step], durationMs: Date.now() - started },
        'maintenance step done',
      );
    } catch (err) {
      failed.push(step);
      deps.logger.error(
        { job: 'maintenance.daily', step, code: (err as { code?: string }).code },
        'maintenance step failed',
      );
    }
  }
  if (failed.length > 0) throw new Error(`maintenance.daily lỗi ở bước: ${failed.join(', ')}`);
  return result;
}

/** Lịch 03:00 giờ Việt Nam (20:00 UTC). */
export const MAINTENANCE_CRON = '0 20 * * *';
