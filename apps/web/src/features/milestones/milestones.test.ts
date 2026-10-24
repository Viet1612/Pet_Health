import { describe, expect, it } from 'vitest';

import { dueLine, milestoneTitle, nextDuePreview, statusChip } from './format';
import type { Milestone } from './queries';

const base: Milestone = {
  id: 'm1',
  petId: 'p1',
  type: 'VACCINE',
  dueOn: '2026-11-17',
  dueSetOn: '2026-10-25',
  note: 'Dại',
  cycleMonths: null,
  status: 'PENDING',
  displayStatus: 'UPCOMING',
  daysUntilDue: 23,
  doneOn: null,
  origin: 'MANUAL',
  previousId: null,
  createdAt: '2026-10-25T00:00:00Z',
};

describe('StatusChip', () => {
  it('màu + chữ theo số ngày tới hạn', () => {
    expect(statusChip({ ...base, daysUntilDue: -3 })).toEqual({
      tone: 'danger',
      label: 'Quá hạn 3 ngày',
    });
    expect(statusChip({ ...base, daysUntilDue: 0 })).toEqual({ tone: 'warning', label: 'Hôm nay' });
    expect(statusChip({ ...base, daysUntilDue: 1 })).toEqual({
      tone: 'warning',
      label: 'Ngày mai',
    });
    expect(statusChip({ ...base, daysUntilDue: 7 })).toEqual({
      tone: 'warning',
      label: 'Còn 7 ngày',
    });
    expect(statusChip({ ...base, daysUntilDue: 23 })).toEqual({
      tone: 'neutral',
      label: 'Còn 23 ngày (17/11)',
    });
    expect(statusChip({ ...base, status: 'DONE', doneOn: '2026-11-14' }).label).toBe(
      'Đã thực hiện 14/11/2026',
    );
    expect(statusChip({ ...base, status: 'CANCELLED' }).tone).toBe('cancelled');
  });
});

describe('dòng mốc', () => {
  it('tiêu đề và dòng phụ', () => {
    expect(milestoneTitle(base)).toBe('Tiêm vaccine · Dại');
    expect(milestoneTitle({ ...base, note: null })).toBe('Tiêm vaccine');
    expect(dueLine(base)).toBe('Hạn 17/11/2026 · tự lặp 12 tháng');
    expect(dueLine({ ...base, type: 'FLEA', cycleMonths: 3 })).toBe(
      'Hạn 17/11/2026 · chu kỳ 3 tháng',
    );
    expect(dueLine({ ...base, type: 'DEWORM' })).toBe('Hạn 17/11/2026');
  });
});

describe('nextDuePreview', () => {
  it('vaccine + 12 tháng, ve/giun + chu kỳ, 29/02 kẹp 28/02, không chu kỳ → null', () => {
    expect(nextDuePreview('VACCINE', null, '2026-11-14')).toBe('2027-11-14');
    expect(nextDuePreview('VACCINE', null, '2028-02-29')).toBe('2029-02-28');
    expect(nextDuePreview('DEWORM', 3, '2026-11-14')).toBe('2027-02-14');
    expect(nextDuePreview('FLEA', null, '2026-11-14')).toBeNull();
  });
});
