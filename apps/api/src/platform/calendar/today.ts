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

/** Ngày lịch hiện tại theo múi giờ IANA của tài khoản (SAD §2.2.3). */
export function todayIn(tz: string, now: Date): LocalDate {
  if (!isValidTimezone(tz)) throw new InvalidTimezoneError(tz);
  return DateTime.fromJSDate(now, { zone: tz }).toISODate() as LocalDate;
}
