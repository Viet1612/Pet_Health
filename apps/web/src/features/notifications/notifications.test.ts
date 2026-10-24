import { describe, expect, it } from 'vitest';

import { groupByDay } from './group-by-day';

describe('groupByDay', () => {
  it('HÔM NAY, HÔM QUA, dd/MM/yyyy theo today của API, giữ thứ tự', () => {
    const items = [
      { id: 'a', appearOn: '2026-11-14' },
      { id: 'b', appearOn: '2026-11-14' },
      { id: 'c', appearOn: '2026-11-13' },
      { id: 'd', appearOn: '2026-11-01' },
    ];
    expect(groupByDay(items, '2026-11-14').map((g) => [g.label, g.items.map((i) => i.id)])).toEqual(
      [
        ['Hôm nay', ['a', 'b']],
        ['Hôm qua', ['c']],
        ['01/11/2026', ['d']],
      ],
    );
  });

  it('hôm qua qua ranh giới tháng/năm', () => {
    expect(groupByDay([{ appearOn: '2026-12-31' }], '2027-01-01')[0]?.label).toBe('Hôm qua');
  });
});
