import { daysInMonth, fromParts, parts, type LocalDate } from './local-date.js';

/**
 * Cộng `n` tháng lịch, SRS §2.10.2: ngày = min(ngày gốc, số ngày của tháng đích).
 * Ví dụ 2028-02-29 + 12 → 2029-02-28; 2026-01-31 + 1 → 2026-02-28.
 */
export function addCalendarMonths(date: LocalDate, n: number): LocalDate {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Số tháng phải là số nguyên ≥ 0: ${String(n)}`);
  }
  const { year, month, day } = parts(date);
  const total = month - 1 + n;
  const targetYear = year + Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  return fromParts(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** Lùi `n` tháng lịch, kẹp ngày cuối tháng: 2026-08-31 − 6 → 2026-02-28 (Dashboard, S5-03). */
export function subtractCalendarMonths(date: LocalDate, n: number): LocalDate {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Số tháng phải là số nguyên ≥ 0: ${String(n)}`);
  }
  const { year, month, day } = parts(date);
  const total = year * 12 + (month - 1) - n;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  return fromParts(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}
