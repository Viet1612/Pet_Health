// Cân nặng tính bằng số nguyên phần mười kg (`"9.2"` → 92) để so sánh và trừ không sai số dấu phẩy
// động. API nhận và trả chuỗi thập phân dấu chấm, 1 chữ số thập phân (SAD §2.4.1).

const KG_PATTERN = /^\d{1,3}(\.\d)?$/;
const MIN_TENTHS = 1;
const MAX_TENTHS = 1500;

export const WEIGHT_RANGE_MESSAGE = 'Cân nặng phải từ 0,1 đến 150 kg, tối đa 1 chữ số thập phân';

/** `"9.2"` → 92; `null` khi sai định dạng hoặc ngoài 0,1–150 kg. */
export function parseWeightKg(value: string): number | null {
  if (!KG_PATTERN.test(value)) return null;
  const [whole = '0', decimal = '0'] = value.split('.');
  const tenths = Number(whole) * 10 + Number(decimal);
  return tenths >= MIN_TENTHS && tenths <= MAX_TENTHS ? tenths : null;
}

/** 92 → `"9.2"`, 90 → `"9.0"`. */
export function formatTenths(tenths: number): string {
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(tenths);
  return `${sign}${String(Math.floor(abs / 10))}.${String(abs % 10)}`;
}

/** Giá trị `numeric(4,1)` từ PostgreSQL (`"9.2"`) → phần mười. */
export function tenthsOf(dbValue: string): number {
  const [whole = '0', decimal = '0'] = dbValue.split('.');
  return Number(whole) * 10 + Number(decimal.slice(0, 1) || '0');
}

/** Chênh lệch số đo mới nhất so với số đo liền trước: `"0.3"`, `"-0.1"`, `"0.0"`. */
export function formatDelta(latest: string, previous: string): string {
  return formatTenths(tenthsOf(latest) - tenthsOf(previous));
}
