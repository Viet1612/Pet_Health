import { addDays, type LocalDate } from '../../../platform/calendar/local-date.js';
import { appearOn, dueLevel } from '../../../platform/calendar/reminder-level.js';
import { todayIn } from '../../../platform/calendar/today.js';
import { UnauthenticatedError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import { notificationRepository } from '../adapters/persistence/notification.repository.js';
import type { NotificationsAppDeps } from './ports.js';

/**
 * Đồng bộ thông báo khi người dùng mở app (FR-NTF-001→006), transaction riêng và ngắn:
 * - Đã đồng bộ hôm nay → dừng ngay (đường nhanh, NFR-PERF-005).
 * - Mỗi mốc PENDING hạn ≤ hôm nay + 7: chỉ mức muộn nhất đã tới (`dueLevel`); không nhắc bù mức
 *   đã qua lúc đặt hạn.
 * - Chèn với `ON CONFLICT DO NOTHING`: request song song chỉ giữ 1 dòng; request thua không
 *   supersede gì (G-15).
 * - Mức mới xuất hiện → mức cũ chưa xem của cùng mốc thành `SUPERSEDED`.
 * Trả "hôm nay" theo múi giờ tài khoản.
 */
export async function syncNotifications(
  deps: NotificationsAppDeps,
  ownerId: string,
): Promise<LocalDate> {
  const now = deps.clock.now();
  return deps.withTx(async (trx) => {
    const tz = await deps.pets.ownerTimezone(trx, ownerId);
    if (tz === undefined) throw new UnauthenticatedError();
    const today = todayIn(tz, now);
    const repo = notificationRepository;
    if ((await repo.getSyncedOn(trx, ownerId)) === today) return today;

    const candidates = await deps.milestones.listPendingDueBy(trx, ownerId, addDays(today, 7));
    const rows = candidates.flatMap((m) => {
      const dueOn = m.dueOn as LocalDate;
      const level = dueLevel(
        { status: 'PENDING', dueOn, dueSetOn: m.dueSetOn as LocalDate },
        today,
      );
      return level
        ? [
            {
              id: newId(),
              owner_id: ownerId,
              milestone_id: m.id,
              level,
              due_on_snapshot: dueOn,
              appear_on: appearOn(level, dueOn),
              created_at: now,
            },
          ]
        : [];
    });

    const inserted = await repo.insertMany(trx, rows);
    await repo.supersede(
      trx,
      ownerId,
      inserted.map((r) => r.milestone_id),
      inserted.map((r) => r.id),
      now,
    );
    await repo.setSyncedOn(trx, ownerId, today);
    return today;
  });
}
