import { describe, expect, it } from 'vitest';

import { buildChartData, monthSplits, yRange } from './chart-data';
import { addMonths, formatDelta, formatKg, formatSignedTenths, parseKgInput } from './format';
import type { WeightEntry } from './queries';

const entry = (measuredOn: string, weightKg: string, createdAt: string): WeightEntry => ({
  id: `${measuredOn}-${createdAt}`,
  measuredOn,
  weightKg,
  createdAt,
});

describe('định dạng kg', () => {
  it('dấu phẩy, dấu trừ U+2212', () => {
    expect(formatKg('9.3')).toBe('9,3 kg');
    expect(formatDelta('0.3')).toBe('+0,3');
    expect(formatDelta('-0.1')).toBe('−0,1');
    expect(formatSignedTenths(0)).toBe('0,0');
  });

  it('parseKgInput: nhận dấu phẩy, kiểm 0,1–150 và 1 chữ số thập phân', () => {
    expect(parseKgInput(' 9,2 ')).toEqual({ ok: true, value: '9.2' });
    expect(parseKgInput('150')).toEqual({ ok: true, value: '150' });
    for (const bad of ['0', '150,1', '9,25', '-1', 'abc']) {
      expect(parseKgInput(bad).ok, bad).toBe(false);
    }
    expect(parseKgInput('')).toEqual({ ok: false, error: 'Trường bắt buộc' });
  });

  it('addMonths kẹp ngày cuối tháng', () => {
    expect(addMonths('2026-08-31', -6)).toBe('2026-02-28');
    expect(addMonths('2026-03-15', -6)).toBe('2025-09-15');
  });
});

describe('dữ liệu biểu đồ', () => {
  it('cửa sổ 6 tháng từ số đo mới nhất, X tăng dần, cùng ngày lệch 60 s theo createdAt', () => {
    const data = buildChartData([
      entry('2026-10-24', '9.5', '2026-10-24T03:00:00Z'),
      entry('2026-10-24', '9.2', '2026-10-24T01:00:00Z'),
      entry('2026-10-01', '8.9', '2026-10-01T01:00:00Z'),
      entry('2026-01-01', '7.0', '2026-01-01T01:00:00Z'),
    ]);
    expect(data?.points.map((p) => [p.measuredOn, p.weightKg])).toEqual([
      ['2026-10-01', '8.9'],
      ['2026-10-24', '9.2'],
      ['2026-10-24', '9.5'],
    ]);
    const [, second, third] = data?.points ?? [];
    expect((third?.x ?? 0) - (second?.x ?? 0)).toBe(60);
    expect(buildChartData([])).toBeNull();
  });

  it('trục Y bao trùm mục tiêu; mốc đầu tháng', () => {
    expect(yRange([9.2, 9.5], 8)).toEqual([7.5, 10]);
    expect(yRange([9.2], null)).toEqual([8.7, 9.7]);
    const start = Date.UTC(2026, 3, 24) / 1000;
    const end = Date.UTC(2026, 9, 24) / 1000;
    expect(monthSplits(start, end).map((s) => new Date(s * 1000).getUTCMonth() + 1)).toEqual([
      5, 6, 7, 8, 9, 10,
    ]);
  });
});
