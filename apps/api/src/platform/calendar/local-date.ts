import { DateTime } from 'luxon';

/** Ngày lịch `YYYY-MM-DD`, không có múi giờ (FR-GEN-001). So sánh được bằng so chuỗi. */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class InvalidLocalDateError extends Error {
  constructor(value: string) {
    super(`Ngày không hợp lệ: ${value}`);
    this.name = 'InvalidLocalDateError';
  }
}

function toDateTime(d: LocalDate): DateTime<true> {
  return DateTime.fromISO(d, { zone: 'UTC' }) as DateTime<true>;
}

function fromDateTime(dt: DateTime): LocalDate {
  return dt.toISODate() as LocalDate;
}

/** Kiểm định dạng và ngày có tồn tại (ví dụ `2026-02-30` là lỗi). */
export function parseLocalDate(value: string): LocalDate {
  if (!ISO_DATE.test(value) || !DateTime.fromISO(value, { zone: 'UTC' }).isValid) {
    throw new InvalidLocalDateError(value);
  }
  return value as LocalDate;
}

export function addDays(d: LocalDate, n: number): LocalDate {
  return fromDateTime(toDateTime(d).plus({ days: n }));
}

/** Số ngày `a − b`. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round(toDateTime(a).diff(toDateTime(b), 'days').days);
}

export function daysInMonth(year: number, month: number): number {
  return DateTime.utc(year, month, 1).daysInMonth ?? 31;
}

export function parts(d: LocalDate): { year: number; month: number; day: number } {
  const dt = toDateTime(d);
  return { year: dt.year, month: dt.month, day: dt.day };
}

export function fromParts(year: number, month: number, day: number): LocalDate {
  return fromDateTime(DateTime.utc(year, month, day));
}
