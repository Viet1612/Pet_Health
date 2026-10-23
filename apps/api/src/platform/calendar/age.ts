import { parts, type LocalDate } from './local-date.js';

/** Tuổi theo tháng, SRS §2.10.1. */
export function ageInMonths(birth: LocalDate, today: LocalDate): number {
  if (birth > today) throw new RangeError('Ngày sinh ở sau hôm nay');
  const b = parts(birth);
  const t = parts(today);
  let months = (t.year - b.year) * 12 + (t.month - b.month);
  if (t.day < b.day) months -= 1;
  return months;
}

/** "{tháng} tháng" khi chưa đủ 1 năm, ngược lại "{năm} năm {tháng} tháng". */
export function formatAge(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years === 0 ? `${String(rest)} tháng` : `${String(years)} năm ${String(rest)} tháng`;
}
