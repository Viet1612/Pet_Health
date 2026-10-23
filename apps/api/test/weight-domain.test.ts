import { describe, expect, it } from 'vitest';

import { validateWeightInput } from '../src/modules/health-records/application/weight-input.js';
import {
  formatDelta,
  formatTenths,
  parseWeightKg,
  tenthsOf,
} from '../src/modules/health-records/domain/weight.js';
import type { LocalDate } from '../src/platform/calendar/local-date.js';

describe('parseWeightKg', () => {
  it('nhận 0,1–150 kg, tối đa 1 chữ số thập phân', () => {
    expect(parseWeightKg('9.2')).toBe(92);
    expect(parseWeightKg('9')).toBe(90);
    expect(parseWeightKg('0.1')).toBe(1);
    expect(parseWeightKg('150')).toBe(1500);
    expect(parseWeightKg('150.0')).toBe(1500);
  });

  it('từ chối 0, âm, > 150, 2 chữ số thập phân, dấu phẩy, rỗng', () => {
    for (const bad of ['0', '0.0', '-1', '150.1', '9.25', '9,2', '', '.5', '1e2', '1000']) {
      expect(parseWeightKg(bad), bad).toBeNull();
    }
  });
});

describe('định dạng', () => {
  it('formatTenths, tenthsOf, formatDelta', () => {
    expect(formatTenths(92)).toBe('9.2');
    expect(formatTenths(90)).toBe('9.0');
    expect(formatTenths(-1)).toBe('-0.1');
    expect(tenthsOf('12.5')).toBe(125);
    expect(formatDelta('9.5', '9.2')).toBe('0.3');
    expect(formatDelta('9.1', '9.2')).toBe('-0.1');
    expect(formatDelta('9.2', '9.2')).toBe('0.0');
  });
});

describe('validateWeightInput', () => {
  const today = '2026-10-24' as LocalDate;

  it('chuẩn hóa kg, nhận ngày hôm nay', () => {
    expect(validateWeightInput({ weightKg: '9', measuredOn: today }, today)).toEqual({
      weightKg: '9.0',
      measuredOn: today,
    });
  });

  it('ngày tương lai → DATE_IN_FUTURE; kg sai → OUT_OF_RANGE', () => {
    expect(() => validateWeightInput({ weightKg: '0', measuredOn: '2026-10-25' }, today)).toThrow(
      expect.objectContaining({
        status: 422,
        options: {
          errors: [
            expect.objectContaining({ field: 'weightKg', code: 'OUT_OF_RANGE' }),
            expect.objectContaining({ field: 'measuredOn', code: 'DATE_IN_FUTURE' }),
          ],
        },
      }) as Error,
    );
  });
});
