import { addDays, diffDays, type LocalDate } from '../../../platform/calendar/local-date.js';

/** Mức nhắc, dùng chung cho kênh `in_app` và `push` sau này (MR-4). */
export type ReminderLevel = 'D7' | 'D1' | 'OVERDUE';

export interface ReminderSubject {
  status: 'PENDING' | 'DONE' | 'CANCELLED';
  dueOn: LocalDate;
  /** Ngày đặt hạn hiện tại (tạo mốc hoặc đổi hạn). */
  dueSetOn: LocalDate;
}

/** Ngày mức nhắc xuất hiện: D7 → hạn − 7, D1 → hạn − 1, OVERDUE → hạn + 1. */
export function appearOn(level: ReminderLevel, dueOn: LocalDate): LocalDate {
  switch (level) {
    case 'D7':
      return addDays(dueOn, -7);
    case 'D1':
      return addDays(dueOn, -1);
    case 'OVERDUE':
      return addDays(dueOn, 1);
  }
}

/** Từ muộn tới sớm: lấy mức muộn nhất đã tới. */
const LEVELS_LATEST_FIRST: readonly ReminderLevel[] = ['OVERDUE', 'D1', 'D7'];

/**
 * Mức nhắc hiện hành của mốc (FR-NTF-001→004): mức muộn nhất `L` có `appearOn(L) ≤ today` và
 * `appearOn(L) > dueSetOn` (không nhắc bù cho mức đã qua lúc đặt hạn). Mốc không PENDING → null.
 */
export function dueLevel(
  m: ReminderSubject,
  today: LocalDate,
  overdueEnabled = true,
): ReminderLevel | null {
  if (m.status !== 'PENDING') return null;
  for (const level of LEVELS_LATEST_FIRST) {
    if (level === 'OVERDUE' && !overdueEnabled) continue;
    const day = appearOn(level, m.dueOn);
    if (day <= today && day > m.dueSetOn) return level;
  }
  return null;
}

/** Nhãn thời gian của thông báo theo N = hạn − hôm nay (FR-NTF-007, SRS §2.6.1). */
export function levelLabel(_level: ReminderLevel, dueOn: LocalDate, today: LocalDate): string {
  const n = diffDays(dueOn, today);
  if (n >= 2) return `còn ${String(n)} ngày`;
  if (n === 1) return 'ngày mai';
  if (n === 0) return 'hôm nay';
  return `quá hạn ${String(-n)} ngày`;
}
