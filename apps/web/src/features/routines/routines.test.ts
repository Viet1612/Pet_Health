import { describe, expect, it } from 'vitest';

import { applyToggle, sortRoutines, type Routine } from './queries';

const r = (id: string, timeOfDay: string, done: boolean): Routine => ({
  id,
  petId: 'p',
  name: id,
  timeOfDay,
  done,
});

describe('routines', () => {
  it('sắp xếp như server: chưa xong trước, rồi theo giờ', () => {
    const items = [
      r('a', '18:00', false),
      r('b', '07:00', true),
      r('c', '07:30', true),
      r('d', '19:00', false),
    ];
    expect(sortRoutines(items).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('applyToggle đảo đúng việc và đếm lại; việc không có trong danh sách → null', () => {
    const data = {
      items: [r('a', '07:00', false), r('b', '08:00', true)],
      doneCount: 1,
      today: 'x',
    };
    const next = applyToggle(data, 'a', true);
    expect(next?.doneCount).toBe(2);
    expect(next?.items.find((i) => i.id === 'a')?.done).toBe(true);
    expect(next?.today).toBe('x');
    expect(applyToggle(data, 'zzz', true)).toBeNull();
  });
});
