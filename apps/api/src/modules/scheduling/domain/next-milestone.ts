import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { addCalendarMonths } from '../../../platform/calendar/months.js';
import type { MilestoneType } from './milestone.js';

/** Vaccine lặp lại sau 12 tháng (BRU-010). */
export const VACCINE_CYCLE_MONTHS = 12;

/**
 * Hạn của mốc kế tiếp, tính từ **ngày thực hiện** (BRU-011): vaccine + 12 tháng; ve/giun + chu kỳ;
 * ve/giun không chu kỳ → không tạo (`null`). Ngày vượt cuối tháng kẹp về ngày cuối (29/02 → 28/02).
 */
export function nextDueOn(
  type: MilestoneType,
  cycleMonths: number | null,
  doneOn: LocalDate,
): LocalDate | null {
  if (type === 'VACCINE') return addCalendarMonths(doneOn, VACCINE_CYCLE_MONTHS);
  return cycleMonths === null ? null : addCalendarMonths(doneOn, cycleMonths);
}
