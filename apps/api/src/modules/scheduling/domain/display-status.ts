import { diffDays, type LocalDate } from '../../../platform/calendar/local-date.js';

export type MilestoneStatus = 'PENDING' | 'DONE' | 'CANCELLED';
export type DisplayStatus = 'UPCOMING' | 'OVERDUE' | 'DONE' | 'CANCELLED';

/** Trạng thái hiển thị của mốc (SRS §2.5.1). */
export function displayStatus(
  m: { status: MilestoneStatus; dueOn: LocalDate },
  today: LocalDate,
): DisplayStatus {
  if (m.status === 'DONE') return 'DONE';
  if (m.status === 'CANCELLED') return 'CANCELLED';
  return m.dueOn >= today ? 'UPCOMING' : 'OVERDUE';
}

/** Số ngày tới hạn (âm khi đã quá hạn), Dashboard trả `daysUntilDue` (SAD §2.4.4). */
export function daysUntilDue(dueOn: LocalDate, today: LocalDate): number {
  return diffDays(dueOn, today);
}
