import { formatMonthYear } from '../../lib/format';

export { formatDate as formatVisitDate, formatDateTime } from '../../lib/format';

/** `2026-09-20` → `{ day: '20', monthYear: '09/2026' }` (en `Sep 2026`) cho ô ngày ở danh sách. */
export function dateParts(isoDate: string): { day: string; monthYear: string } {
  return { day: isoDate.slice(8, 10), monthYear: formatMonthYear(isoDate) };
}

/** Đếm ký tự như server: code point sau NFC. */
export const countChars = (s: string): number => Array.from(s.normalize('NFC')).length;

export const VISIT_TEXT_MAX = 2000;
