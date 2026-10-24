import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { levelLabel, type ReminderLevel } from '../../../platform/calendar/reminder-level.js';
import type { NotificationRow } from '../adapters/persistence/notification.repository.js';
import type { NotificationsAppDeps, Trx } from './ports.js';

export interface NotificationView {
  id: string;
  level: ReminderLevel;
  /** "còn N ngày" / "ngày mai" / "hôm nay" / "quá hạn N ngày", tính lúc đọc; `null` khi đã resolve. */
  label: string | null;
  milestoneId: string;
  petId: string;
  petName: string;
  type: 'VACCINE' | 'FLEA' | 'DEWORM';
  note: string | null;
  dueOn: string;
  appearOn: string;
  unread: boolean;
  resolution: 'DONE' | 'CANCELLED' | 'RESCHEDULED' | null;
  createdAt: string;
}

export const LEVEL_RANK: Record<string, number> = { OVERDUE: 3, D1: 2, D7: 1 };

/** Gắn tên thú cưng, loại và ghi chú hiện tại của mốc vào các dòng thông báo. */
export async function toNotificationViews(
  deps: NotificationsAppDeps,
  trx: Trx,
  ownerId: string,
  rows: NotificationRow[],
  today: LocalDate,
): Promise<NotificationView[]> {
  const milestones = await deps.milestones.getSummaries(trx, ownerId, [
    ...new Set(rows.map((r) => r.milestone_id)),
  ]);
  const byId = new Map(milestones.map((m) => [m.id, m]));
  const names = await deps.pets.getNames(trx, ownerId, [
    ...new Set(milestones.map((m) => m.petId)),
  ]);
  return rows.flatMap((r) => {
    const m = byId.get(r.milestone_id);
    if (!m) return [];
    const dueOn = r.due_on_snapshot as LocalDate;
    return [
      {
        id: r.id,
        level: r.level as ReminderLevel,
        label: r.resolution ? null : levelLabel(r.level as ReminderLevel, dueOn, today),
        milestoneId: r.milestone_id,
        petId: m.petId,
        petName: names.get(m.petId) ?? '',
        type: m.type as NotificationView['type'],
        note: m.note,
        dueOn: r.due_on_snapshot,
        appearOn: r.appear_on,
        unread: r.read_at === null,
        resolution: r.resolution as NotificationView['resolution'],
        createdAt: r.created_at.toISOString(),
      },
    ];
  });
}
