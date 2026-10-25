import { DateTime, IANAZone } from 'luxon';

import type { LocalDate } from './local-date.js';

export class InvalidTimezoneError extends Error {
  constructor(tz: string) {
    super(`Múi giờ không hợp lệ: ${tz}`);
    this.name = 'InvalidTimezoneError';
  }
}

export function isValidTimezone(tz: string): boolean {
  return IANAZone.isValidZone(tz);
}

/**
 * Múi giờ chọn được trong Cài đặt (S6-01): IANA hợp lệ **và** có trong danh sách của `Intl` (hoặc
 * `UTC`). Loại "GMT+7", tên viết tắt hay alias cũ.
 */
export function isSelectableTimezone(tz: string): boolean {
  if (!isValidTimezone(tz)) return false;
  if (tz === 'UTC') return true;
  // ICU có thể liệt kê tên cũ (Asia/Saigon thay Asia/Ho_Chi_Minh): so theo tên đã chuẩn hóa.
  const canonical = new Intl.DateTimeFormat('en', { timeZone: tz }).resolvedOptions().timeZone;
  const supported = Intl.supportedValuesOf('timeZone');
  return supported.includes(tz) || supported.includes(canonical);
}

/** Ngày lịch hiện tại theo múi giờ IANA của tài khoản (SAD §2.2.3). */
export function todayIn(tz: string, now: Date): LocalDate {
  if (!isValidTimezone(tz)) throw new InvalidTimezoneError(tz);
  return DateTime.fromJSDate(now, { zone: tz }).toISODate() as LocalDate;
}
