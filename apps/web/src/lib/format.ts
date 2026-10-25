// Định dạng ngày, giờ, số theo ngôn ngữ giao diện (FR-GEN-002, S4-07). API dùng ngày `YYYY-MM-DD`
// và chuỗi thập phân dấu chấm ("9.3"). Mọi hàm nhận `loc` để test; mặc định là ngôn ngữ đang dùng.

import { locale, type Locale } from '../i18n';

const MINUS = '−';

const parts = (isoDate: string) => {
  const [y = '', m = '', d = ''] = isoDate.split('-');
  return { y, m, d };
};

/** Ngày lịch `YYYY-MM-DD` → Date 00:00 UTC; định dạng với `timeZone: 'UTC'` để không lệch ngày. */
const utc = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

const enDate = (opts: Intl.DateTimeFormatOptions, isoDate: string) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(utc(isoDate));

/** `2026-11-15` → vi `15/11/2026`, en `Nov 15, 2026` */
export function formatDate(isoDate: string, loc: Locale = locale): string {
  if (loc === 'en') return enDate({ month: 'short', day: 'numeric', year: 'numeric' }, isoDate);
  const { y, m, d } = parts(isoDate);
  return `${d}/${m}/${y}`;
}

/** `2026-11-15` → vi `15/11`, en `Nov 15` */
export function formatDayMonth(isoDate: string, loc: Locale = locale): string {
  if (loc === 'en') return enDate({ month: 'short', day: 'numeric' }, isoDate);
  const { m, d } = parts(isoDate);
  return `${d}/${m}`;
}

/** `2026-09-20` → vi `09/2026`, en `Sep 2026` */
export function formatMonthYear(isoDate: string, loc: Locale = locale): string {
  if (loc === 'en') return enDate({ month: 'short', year: 'numeric' }, isoDate);
  const { y, m } = parts(isoDate);
  return `${m}/${y}`;
}

/** Nhãn tháng trục biểu đồ từ giây Unix (UTC): vi `T9`, en `Sep` */
export function formatMonthShort(seconds: number, loc: Locale = locale): string {
  const date = new Date(seconds * 1000);
  if (loc === 'en')
    return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
  return `T${String(date.getUTCMonth() + 1)}`;
}

/** Thời điểm ISO theo múi giờ tài khoản → vi `15/11/2026 18:40`, en `Nov 15, 2026, 6:40 PM` */
export function formatDateTime(
  iso: string,
  timeZone: string | undefined,
  loc: Locale = locale,
): string {
  try {
    if (loc === 'en') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(iso));
    }
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
  } catch {
    return iso;
  }
}

/** Dấu thập phân: vi `,`, en `.` */
const decimal = (s: string, loc: Locale) => (loc === 'vi' ? s.replace('.', ',') : s);

/** Số 1 chữ số thập phân (trục kg): `9.25` → vi `9,3`, en `9.3` */
export const formatDecimal1 = (n: number, loc: Locale = locale): string =>
  decimal(n.toFixed(1), loc);

/** `"9.3"` → vi `9,3 kg`, en `9.3 kg` */
export const formatKg = (kg: string, loc: Locale = locale): string => `${decimal(kg, loc)} kg`;

/** Chênh lệch theo phần mười → `+0,3`, `−0,1` (U+2212), `0,0` (en dấu chấm). */
export function formatSignedTenths(tenths: number, loc: Locale = locale): string {
  const abs = Math.abs(tenths);
  const body = decimal(`${String(Math.floor(abs / 10))}.${String(abs % 10)}`, loc);
  if (tenths > 0) return `+${body}`;
  if (tenths < 0) return `${MINUS}${body}`;
  return body;
}

/**
 * Thời gian tương đối cho bài đăng (F-06): "3 giờ trước" / "3 hours ago"; quá 7 ngày → ngày tháng.
 */
export function formatRelative(iso: string, now = Date.now(), loc: Locale = locale): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 7 * 86_400) return rtf.format(Math.round(diffSec / 86_400), 'day');
  return formatDate(iso.slice(0, 10), loc);
}
