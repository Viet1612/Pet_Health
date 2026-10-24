// 9 ca SRS §2.6 + 2 ca từ AC US-041 (S4-06 §5): mỗi ca 1 tài khoản; tạo mốc ở ngày đặt hạn, "mở
// app" ở từng ngày trong cột mở app (09:00 giờ VN), kiểm thông báo sau lần mở cuối.
import { expect, test } from '@playwright/test';

import { ApiSession, resetClock, setClock, vn } from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

interface Case {
  n: number;
  setOn: string;
  due: string;
  open: string[];
  expect: { unread: { level: string; label: string }[]; read?: string[]; total: number };
}

const CASES: Case[] = [
  {
    n: 1,
    setOn: '2026-11-01',
    due: '2026-11-15',
    open: ['2026-11-07'],
    expect: { unread: [], total: 0 },
  },
  {
    n: 2,
    setOn: '2026-11-01',
    due: '2026-11-15',
    open: ['2026-11-08'],
    expect: { unread: [{ level: 'D7', label: 'còn 7 ngày' }], total: 1 },
  },
  {
    n: 3,
    setOn: '2026-11-01',
    due: '2026-11-15',
    open: ['2026-11-07', '2026-11-11'],
    expect: { unread: [{ level: 'D7', label: 'còn 4 ngày' }], total: 1 },
  },
  {
    n: 4,
    setOn: '2026-11-01',
    due: '2026-11-15',
    open: ['2026-11-08', '2026-11-14'],
    expect: { unread: [{ level: 'D1', label: 'ngày mai' }], read: ['D7'], total: 2 },
  },
  {
    n: 5,
    setOn: '2026-11-01',
    due: '2026-11-15',
    open: ['2026-11-07', '2026-11-14'],
    expect: { unread: [{ level: 'D1', label: 'ngày mai' }], total: 1 },
  },
  {
    n: 6,
    setOn: '2026-11-11',
    due: '2026-11-15',
    open: ['2026-11-11'],
    expect: { unread: [], total: 0 },
  },
  {
    n: 7,
    setOn: '2026-11-11',
    due: '2026-11-12',
    open: ['2026-11-11'],
    expect: { unread: [], total: 0 },
  },
  {
    n: 8,
    setOn: '2026-11-11',
    due: '2026-11-12',
    open: ['2026-11-13'],
    expect: { unread: [{ level: 'OVERDUE', label: 'quá hạn 1 ngày' }], total: 1 },
  },
  {
    n: 9,
    setOn: '2026-11-11',
    due: '2026-11-01',
    open: ['2026-11-11', '2026-11-20'],
    expect: { unread: [], total: 0 },
  },
];

for (const c of CASES) {
  test(`SRS §2.6 ca ${String(c.n)}: đặt ${c.setOn}, hạn ${c.due}, mở ${c.open.join(', ')}`, async () => {
    await setClock(vn(c.setOn));
    const s = await ApiSession.register();
    const petId = await s.createPet();
    await s.createMilestone(petId, { type: 'VACCINE', dueOn: c.due });

    let app = {
      summary: { unreadCount: -1 },
      items: [] as { level: string; label: string; unread: boolean }[],
    };
    for (const day of c.open) {
      await setClock(vn(day));
      app = await s.openApp();
    }
    expect(app.items).toHaveLength(c.expect.total);
    expect(
      app.items.filter((i) => i.unread).map((i) => ({ level: i.level, label: i.label })),
    ).toEqual(c.expect.unread);
    expect(app.items.filter((i) => !i.unread).map((i) => i.level)).toEqual(c.expect.read ?? []);
    expect(app.summary.unreadCount).toBe(c.expect.unread.length);

    if (c.n === 9) {
      const groups = await s.call('GET', `/pets/${petId}/milestones`);
      expect(groups.body.overdue).toHaveLength(1);
    }
    await s.dispose();
  });
}

test('US-041 (a): ngày 05/11 đổi hạn 15/11 → 20/11 → D7 từ 13/11, D1 từ 19/11', async () => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const petId = await s.createPet();
  const m = await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });

  await setClock(vn('2026-11-05'));
  expect(
    (await s.call('PATCH', `/milestones/${m.id as string}`, { dueOn: '2026-11-20' })).status,
  ).toBe(200);

  await setClock(vn('2026-11-12'));
  expect((await s.openApp()).items).toHaveLength(0);
  await setClock(vn('2026-11-13'));
  expect((await s.openApp()).items.map((i) => [i.level, i.unread])).toEqual([['D7', true]]);
  await setClock(vn('2026-11-19'));
  const app = await s.openApp();
  expect(app.items.find((i) => i.level === 'D1')).toMatchObject({
    unread: true,
    label: 'ngày mai',
  });
  await s.dispose();
});

test('US-041 (b): ngày 10/11 đánh dấu mốc hạn 15/11 → 14/11 không có D1', async () => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const petId = await s.createPet();
  const m = await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });

  await setClock(vn('2026-11-10'));
  expect(
    (await s.call('POST', `/milestones/${m.id as string}/complete`, { doneOn: '2026-11-10' }))
      .status,
  ).toBe(200);
  await setClock(vn('2026-11-14'));
  const app = await s.openApp();
  expect(app.summary.unreadCount).toBe(0);
  expect(app.items.filter((i) => i.level === 'D1')).toHaveLength(0);
  await s.dispose();
});
