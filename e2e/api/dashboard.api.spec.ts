// GET /dashboard (S5-03): mốc sắp tới, banner, lọc theo thú cưng, checklist, cân nặng, tài khoản rỗng.
import { expect, test } from '@playwright/test';

import { ApiSession, resetClock, setClock, vn } from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

test('tài khoản chưa có thú cưng: các phần rỗng, weight null', async () => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const res = await s.call('GET', '/dashboard');
  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toBe('no-store');
  expect(res.body).toMatchObject({
    today: '2026-11-14',
    account: { emailVerified: false },
    notifications: { unreadCount: 0, banner: null },
    pets: [],
    routines: { doneCount: 0, totalCount: 0, items: [] },
    upcomingMilestones: [],
    weight: null,
  });
  expect((await s.call('GET', '/dashboard?pet=abc')).status).toBe(422);
  await s.dispose();
});

test('mốc: tối đa 5, quá hạn trước, +30 có, +31 không, DONE không', async () => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const petId = await s.createPet('Mochi');
  // 6 mốc quá hạn (so với 14/11) + mốc hạn 14/12 (+30) + 15/12 (+31).
  for (const due of [
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
    '2026-11-07',
  ]) {
    await s.createMilestone(petId, { type: 'DEWORM', dueOn: due });
  }
  await setClock(vn('2026-11-14'));
  let res = await s.call('GET', '/dashboard');
  expect(res.body.upcomingMilestones.map((m: { dueOn: string }) => m.dueOn)).toEqual([
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
  ]);
  expect(res.body.upcomingMilestones[0]).toMatchObject({
    petName: 'Mochi',
    displayStatus: 'OVERDUE',
    daysUntilDue: -12,
  });

  // Tài khoản khác: +30 có, +31 không.
  const t = await ApiSession.register();
  const p2 = await t.createPet('Bơ');
  await t.createMilestone(p2, { type: 'VACCINE', dueOn: '2026-12-14' });
  await t.createMilestone(p2, { type: 'VACCINE', dueOn: '2026-12-15' });
  res = await t.call('GET', '/dashboard');
  expect(res.body.upcomingMilestones.map((m: { dueOn: string }) => m.dueOn)).toEqual([
    '2026-12-14',
  ]);
  await s.dispose();
  await t.dispose();
});

test('banner: OVERDUE > D1 > D7, moreCount; lọc theo thú cưng không lẫn thú cưng khác', async () => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const mochi = await s.createPet('Mochi');
  const bo = await s.createPet('Bơ');
  await s.createMilestone(mochi, { type: 'VACCINE', dueOn: '2026-11-21' }); // D7 ngày 14
  await s.createMilestone(mochi, { type: 'FLEA', dueOn: '2026-11-15' }); // D1 ngày 14
  await s.createMilestone(bo, { type: 'DEWORM', dueOn: '2026-11-10' }); // OVERDUE ngày 14

  await setClock(vn('2026-11-14'));
  const all = await s.call('GET', '/dashboard');
  expect(all.body.notifications.unreadCount).toBe(3);
  expect(all.body.notifications.banner.top).toMatchObject({ level: 'OVERDUE', petName: 'Bơ' });
  expect(all.body.notifications.banner.moreCount).toBe(2);
  // Thú cưng đầu tiên (cũ nhất) cho phần cân nặng khi "Tất cả".
  expect(all.body.weight).toMatchObject({ petName: 'Mochi', latest: null, series: [] });

  const onlyMochi = await s.call('GET', `/dashboard?pet=${mochi}`);
  expect(onlyMochi.body.notifications.unreadCount).toBe(2);
  expect(onlyMochi.body.notifications.banner.top).toMatchObject({ level: 'D1', petName: 'Mochi' });
  expect(
    onlyMochi.body.upcomingMilestones.every((m: { petName: string }) => m.petName === 'Mochi'),
  ).toBe(true);

  // Đọc hết → banner null.
  await s.call('POST', '/notifications/read-all', { upTo: '2026-11-14T03:00:00Z' });
  await setClock(vn('2026-11-14', '10:00:00'));
  const after = await s.call('GET', '/dashboard');
  expect(after.body.notifications).toEqual({ unreadCount: 0, banner: null });
  await s.dispose();
});

test('checklist gộp mọi thú cưng có petName; cân nặng: delta và series 6 tháng', async () => {
  await setClock(vn('2026-04-01'));
  let s = await ApiSession.register();
  const mochi = await s.createPet('Mochi');
  await s.call(
    'POST',
    `/pets/${mochi}/weights`,
    { weightKg: '8.0', measuredOn: '2026-04-01' },
    { idempotent: true },
  );
  await setClock(vn('2026-11-14'));
  // Phiên 30 ngày đã hết sau khi nhảy 7 tháng: đăng nhập lại.
  await s.dispose();
  s = await ApiSession.login(s.email);
  for (const [w, d] of [
    ['8.6', '2026-06-01'],
    ['9.3', '2026-11-01'],
  ] as const) {
    await s.call(
      'POST',
      `/pets/${mochi}/weights`,
      { weightKg: w, measuredOn: d },
      { idempotent: true },
    );
  }
  const r = await s.call(
    'POST',
    `/pets/${mochi}/routines`,
    { name: 'Cho ăn', timeOfDay: '07:00' },
    { idempotent: true },
  );
  await s.call('PUT', `/routines/${r.body.id as string}/completion`, { done: true });

  const res = await s.call('GET', '/dashboard');
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  expect(res.body.routines).toMatchObject({ doneCount: 1, totalCount: 1 });
  expect(res.body.routines.items[0]).toMatchObject({ petName: 'Mochi', done: true });
  expect(res.body.weight.latest).toMatchObject({ measuredOn: '2026-11-01', delta: '0.7' });
  // Số đo 01/04 (hơn 6 tháng trước 14/11) không có trong series.
  expect(res.body.weight.series.map((p: { measuredOn: string }) => p.measuredOn)).toEqual([
    '2026-06-01',
    '2026-11-01',
  ]);
  await s.dispose();
});
