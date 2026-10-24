import { describe, expect, it } from 'vitest';

import { nextDueOn } from '../src/modules/scheduling/domain/next-milestone.js';
import type { LocalDate } from '../src/platform/calendar/local-date.js';

const d = (s: string) => s as LocalDate;

describe('nextDueOn', () => {
  it('vaccine + 12 tháng tính từ ngày thực hiện; 29/02 kẹp về 28/02', () => {
    expect(nextDueOn('VACCINE', null, d('2026-11-14'))).toBe('2027-11-14');
    expect(nextDueOn('VACCINE', null, d('2028-02-29'))).toBe('2029-02-28');
  });

  it('ve/giun theo chu kỳ; không chu kỳ → không tạo', () => {
    expect(nextDueOn('FLEA', 3, d('2026-11-14'))).toBe('2027-02-14');
    expect(nextDueOn('DEWORM', 1, d('2026-01-31'))).toBe('2026-02-28');
    expect(nextDueOn('DEWORM', null, d('2026-11-14'))).toBeNull();
  });
});
