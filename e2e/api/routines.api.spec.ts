// Việc hằng ngày (S5-01): giới hạn 20, song song, qua nửa đêm theo múi giờ, xóa mềm, sắp xếp.
import { expect, test } from '@playwright/test';

import { ApiSession, resetClock, setClock } from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

test('giới hạn 20 việc; 2 request song song ở mức 19 → 1 thành công, 1 nhận 409', async () => {
  await setClock('2026-11-14T02:00:00Z');
  const s = await ApiSession.register();
  const petId = await s.createPet();
  const create = (name: string) =>
    s.call('POST', `/pets/${petId}/routines`, { name, timeOfDay: '07:00' }, { idempotent: true });

  for (let i = 1; i <= 19; i += 1) expect((await create(`Việc ${String(i)}`)).status).toBe(201);
  const pair = await Promise.all([create('A'), create('B')]);
  expect(pair.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(pair.find((r) => r.status === 409)?.body.code).toBe('ROUTINE_LIMIT_REACHED');

  // Xóa 1 việc → tạo lại được.
  const list = await s.call('GET', `/pets/${petId}/routines`);
  expect(list.body.totalCount).toBe(20);
  expect((await s.call('DELETE', `/routines/${list.body.items[0].id as string}`)).status).toBe(204);
  expect((await create('Thay thế')).status).toBe(201);
  await s.dispose();
});

test('đánh dấu 23:50 ngày D → 00:01 ngày D+1 thành chưa xong (Asia/Ho_Chi_Minh)', async () => {
  await setClock('2026-11-14T16:50:00Z'); // 23:50 ngày 14 giờ VN
  const s = await ApiSession.register();
  const petId = await s.createPet();
  const r = await s.call(
    'POST',
    `/pets/${petId}/routines`,
    { name: 'Cho ăn tối', timeOfDay: '19:00' },
    { idempotent: true },
  );
  const id = r.body.id as string;

  const done = await s.call('PUT', `/routines/${id}/completion`, { done: true });
  expect(done.body).toEqual({ localDate: '2026-11-14', done: true });
  // Gửi lặp vẫn 200.
  expect((await s.call('PUT', `/routines/${id}/completion`, { done: true })).status).toBe(200);
  expect((await s.call('GET', `/pets/${petId}/routines`)).body.doneCount).toBe(1);

  await setClock('2026-11-14T17:01:00Z'); // 00:01 ngày 15
  const next = await s.call('GET', `/pets/${petId}/routines`);
  expect(next.body.today).toBe('2026-11-15');
  expect(next.body.items[0].done).toBe(false);
  const again = await s.call('PUT', `/routines/${id}/completion`, { done: true });
  expect(again.body.localDate).toBe('2026-11-15');
  await s.dispose();
});

test('cùng thời điểm UTC, tài khoản America/Los_Angeles có ngày khác', async () => {
  await setClock('2026-11-14T17:01:00Z'); // 09:01 ngày 14 giờ LA
  const s = await ApiSession.register({ timezone: 'America/Los_Angeles' });
  const petId = await s.createPet();
  expect((await s.call('GET', `/pets/${petId}/routines`)).body.today).toBe('2026-11-14');
  await s.dispose();
});

test('sắp xếp: việc xong xuống cuối; xóa mềm → 404 cho mọi thao tác sau', async () => {
  await setClock('2026-11-14T02:00:00Z');
  const s = await ApiSession.register();
  const petId = await s.createPet();
  const ids: Record<string, string> = {};
  for (const t of ['18:00', '19:00', '07:00', '07:30']) {
    const r = await s.call(
      'POST',
      `/pets/${petId}/routines`,
      { name: `Việc ${t}`, timeOfDay: t },
      { idempotent: true },
    );
    ids[t] = r.body.id as string;
  }
  await s.call('PUT', `/routines/${ids['07:00'] ?? ''}/completion`, { done: true });
  await s.call('PUT', `/routines/${ids['07:30'] ?? ''}/completion`, { done: true });
  const list = await s.call('GET', `/pets/${petId}/routines`);
  expect(list.body.items.map((i: { timeOfDay: string }) => i.timeOfDay)).toEqual([
    '18:00',
    '19:00',
    '07:00',
    '07:30',
  ]);

  const gone = ids['07:00'] ?? '';
  expect((await s.call('DELETE', `/routines/${gone}`)).status).toBe(204);
  expect((await s.call('DELETE', `/routines/${gone}`)).status).toBe(404);
  expect((await s.call('PATCH', `/routines/${gone}`, { name: 'x' })).status).toBe(404);
  expect((await s.call('PUT', `/routines/${gone}/completion`, { done: false })).status).toBe(404);
  expect((await s.call('GET', `/pets/${petId}/routines`)).body.totalCount).toBe(3);
  await s.dispose();
});
