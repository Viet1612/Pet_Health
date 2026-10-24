import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatDecimal1,
  formatKg,
  formatMonthShort,
  formatMonthYear,
  formatSignedTenths,
} from './format';

describe('lib/format', () => {
  it('ngày: vi dd/MM/yyyy, en "Nov 15, 2026", không lệch ngày đầu/cuối năm', () => {
    expect(formatDate('2026-11-15', 'vi')).toBe('15/11/2026');
    expect(formatDate('2026-11-15', 'en')).toBe('Nov 15, 2026');
    expect(formatDate('2027-01-01', 'en')).toBe('Jan 1, 2027');
    expect(formatDate('2026-12-31', 'en')).toBe('Dec 31, 2026');
    expect(formatDayMonth('2026-11-15', 'vi')).toBe('15/11');
    expect(formatDayMonth('2026-11-15', 'en')).toBe('Nov 15');
    expect(formatMonthYear('2026-09-20', 'vi')).toBe('09/2026');
    expect(formatMonthYear('2026-09-20', 'en')).toBe('Sep 2026');
  });

  it('nhãn tháng trục biểu đồ', () => {
    const s = Date.parse('2026-09-01T00:00:00Z') / 1000;
    expect(formatMonthShort(s, 'vi')).toBe('T9');
    expect(formatMonthShort(s, 'en')).toBe('Sep');
  });

  it('giờ theo múi giờ tài khoản', () => {
    const iso = '2026-11-15T11:40:00Z';
    expect(formatDateTime(iso, 'Asia/Ho_Chi_Minh', 'vi')).toBe('15/11/2026 18:40');
    expect(formatDateTime(iso, 'Asia/Ho_Chi_Minh', 'en').replace(/\s/g, ' ')).toBe(
      'Nov 15, 2026, 6:40 PM',
    );
  });

  it('kg và chênh lệch: vi dấu phẩy, en dấu chấm, số âm dùng U+2212', () => {
    expect(formatKg('9.3', 'vi')).toBe('9,3 kg');
    expect(formatKg('9.3', 'en')).toBe('9.3 kg');
    expect(formatSignedTenths(-1, 'vi')).toBe('−0,1');
    expect(formatSignedTenths(-1, 'en')).toBe('−0.1');
    expect(formatSignedTenths(3, 'en')).toBe('+0.3');
    expect(formatSignedTenths(0, 'vi')).toBe('0,0');
    expect(formatDecimal1(9.25, 'vi')).toMatch(/^9,[23]$/);
    expect(formatDecimal1(12, 'en')).toBe('12.0');
  });
});
