// Định dạng cân nặng và ngày cho giao diện (FR-GEN-002): kg dấu phẩy, ngày dd/MM/yyyy. API dùng
// chuỗi thập phân dấu chấm ("9.2") và ngày YYYY-MM-DD.

import { vi } from '../../i18n/vi';

const KG_PATTERN = /^\d{1,3}(\.\d)?$/;
const MINUS = '−';

/** `"9.3"` → `"9,3 kg"` */
export const formatKg = (kg: string): string => `${kg.replace('.', ',')} kg`;

/** Phần mười kg của chuỗi API: `"9.3"` → 93. */
export function tenthsOf(kg: string): number {
  const [whole = '0', decimal = '0'] = kg.split('.');
  const sign = whole.startsWith('-') ? -1 : 1;
  return sign * (Math.abs(Number(whole)) * 10 + Number(decimal.slice(0, 1) || '0'));
}

/** Chênh lệch theo phần mười → `"+0,3"`, `"−0,1"` (U+2212), `"0,0"`. */
export function formatSignedTenths(tenths: number): string {
  const abs = Math.abs(tenths);
  const body = `${String(Math.floor(abs / 10))},${String(abs % 10)}`;
  if (tenths > 0) return `+${body}`;
  if (tenths < 0) return `${MINUS}${body}`;
  return body;
}

/** Chênh lệch dạng API (`"0.3"`, `"-0.1"`) → `"+0,3"`, `"−0,1"`. */
export const formatDelta = (delta: string): string => formatSignedTenths(tenthsOf(delta));

/** `2026-11-01` → `01/11/2026` */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d ?? ''}/${m ?? ''}/${y ?? ''}`;
}

/**
 * Chuẩn hóa ô nhập kg: trim, `,` → `.`. Trả chuỗi gửi API hoặc thông điệp lỗi (cùng thông điệp
 * server; server vẫn kiểm lại).
 */
export function parseKgInput(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim().replace(',', '.');
  if (value === '') return { ok: false, error: vi.weights.errors.required };
  if (!KG_PATTERN.test(value)) return { ok: false, error: vi.weights.errors.range };
  const tenths = tenthsOf(value);
  if (tenths < 1 || tenths > 1500) return { ok: false, error: vi.weights.errors.range };
  return { ok: true, value };
}

/** Ngày hôm nay theo múi giờ tài khoản (`user.timezone`), dạng `YYYY-MM-DD`. */
export function todayIn(timeZone: string | undefined): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Cộng/trừ tháng lịch, kẹp về ngày cuối tháng: `2026-08-31` − 6 tháng → `2026-02-28`. */
export function addMonths(isoDate: string, months: number): string {
  const [y = 0, m = 1, d = 1] = isoDate.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(year)}-${pad(month)}-${pad(Math.min(d, lastDay))}`;
}

/** `YYYY-MM-DD` → giây Unix tại 00:00 UTC (trục X của biểu đồ). */
export const dateToSeconds = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`) / 1000;
