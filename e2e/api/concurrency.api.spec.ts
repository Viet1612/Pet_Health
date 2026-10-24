// G-15 (S4-06 §6): hai "thiết bị" (2 phiên của cùng tài khoản) tải song song → nhắc không bao giờ
// bị nhân đôi; đánh dấu song song cùng ngày → đúng 1 mốc kế tiếp.
import { expect, test } from '@playwright/test';

import { ApiSession, resetClock, setClock, vn } from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

test('2 thiết bị × 10 request song song: mỗi mức nhắc đúng 1 dòng; đánh dấu song song: 1 mốc kế tiếp', async () => {
  await setClock(vn('2026-11-01'));
  const a = await ApiSession.register();
  const b = await ApiSession.login(a.email);
  const petId = await a.createPet();
  const m = await a.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });

  const burst = () =>
    Promise.all(
      Array.from({ length: 10 }, () => [
        a.call('GET', '/notifications/summary'),
        b.call('GET', '/notifications/summary'),
      ]).flat(),
    );

  await setClock(vn('2026-11-08'));
  const day8 = await burst();
  expect(day8.every((r) => r.status === 200 && r.body.unreadCount === 1)).toBe(true);
  expect((await a.call('GET', '/notifications')).body.items).toHaveLength(1);

  await setClock(vn('2026-11-14'));
  const day14 = await burst();
  expect(day14.every((r) => r.status === 200 && r.body.unreadCount === 1)).toBe(true);
  const items = (await b.call('GET', '/notifications')).body.items as {
    level: string;
    unread: boolean;
  }[];
  expect(items.map((i) => [i.level, i.unread]).sort()).toEqual([
    ['D1', true],
    ['D7', false],
  ]);

  const [r1, r2] = await Promise.all([
    a.call('POST', `/milestones/${m.id as string}/complete`, { doneOn: '2026-11-14' }),
    b.call('POST', `/milestones/${m.id as string}/complete`, { doneOn: '2026-11-14' }),
  ]);
  expect([r1.status, r2.status]).toEqual([200, 200]);
  expect(r1.body.nextMilestone.id).toBe(r2.body.nextMilestone.id);
  const groups = (await a.call('GET', `/pets/${petId}/milestones`)).body;
  const auto = [...groups.upcoming, ...groups.overdue].filter(
    (x: { origin: string }) => x.origin === 'AUTO',
  );
  expect(auto).toHaveLength(1);

  await a.dispose();
  await b.dispose();
});
