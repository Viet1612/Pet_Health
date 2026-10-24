// G-3 qua API (S4-06 §3): đăng ký → xác minh → thú cưng → mốc → D7, D1 → đánh dấu → thông báo đã
// xử lý → mốc kế tiếp → hoàn tác. Múi giờ Asia/Ho_Chi_Minh.
import { expect, test } from '@playwright/test';

import {
  advanceClock,
  ApiSession,
  resetClock,
  setClock,
  tokenOf,
  verificationLink,
  vn,
} from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

test('luồng cốt lõi: nhắc D7, D1, đánh dấu, mốc kế tiếp, hoàn tác', async () => {
  // 1. Đăng ký, xác minh qua Mailpit, thêm Mochi.
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const verify = await s.call('POST', '/auth/verify-email', {
    token: tokenOf(await verificationLink(s.email)),
  });
  expect(verify.status).toBe(200);
  expect(verify.body.user.emailVerified).toBe(true);
  const petId = await s.createPet('Mochi');

  // 2. Mốc vaccine hạn 15/11, ghi chú "Dại".
  const m = await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15', note: 'Dại' });
  expect(m.dueSetOn).toBe('2026-11-01');

  // 3. 07/11 23:59 → chưa có gì.
  await setClock(vn('2026-11-07', '23:59:00'));
  expect((await s.openApp()).summary.unreadCount).toBe(0);

  // 4. 08/11 00:01 → 1 D7 "còn 7 ngày".
  await setClock(vn('2026-11-08', '00:01:00'));
  let app = await s.openApp();
  expect(app.summary.unreadCount).toBe(1);
  expect(app.summary.banner.top).toMatchObject({
    level: 'D7',
    label: 'còn 7 ngày',
    petName: 'Mochi',
  });
  expect(app.items).toHaveLength(1);

  // 5. 14/11 → 1 chưa xem D1 "ngày mai"; D7 đã xem (SUPERSEDED).
  await setClock(vn('2026-11-14', '08:00:00'));
  app = await s.openApp();
  expect(app.summary.unreadCount).toBe(1);
  expect(app.items.find((n) => n.level === 'D1')).toMatchObject({
    unread: true,
    label: 'ngày mai',
  });
  expect(app.items.find((n) => n.level === 'D7')).toMatchObject({ unread: false });

  // 6. Đánh dấu 14/11 → mốc kế tiếp 14/11/2027, 2 thông báo resolve DONE.
  const done = await s.call('POST', `/milestones/${m.id as string}/complete`, {
    doneOn: '2026-11-14',
  });
  expect(done.status).toBe(200);
  expect(done.body.nextMilestone).toMatchObject({
    dueOn: '2027-11-14',
    note: 'Dại',
    origin: 'AUTO',
  });
  expect(done.body.resolvedNotificationIds).toHaveLength(2);
  app = await s.openApp();
  expect(app.summary.unreadCount).toBe(0);
  expect(app.items.map((n) => n.resolution)).toEqual(['DONE', 'DONE']);

  // 7. Hoàn tác ngay → D1 chưa xem lại, mốc kế tiếp biến mất.
  const nextId = done.body.nextMilestone.id as string;
  expect((await s.call('POST', `/milestones/${m.id as string}/undo-complete`)).status).toBe(200);
  app = await s.openApp();
  expect(app.items.find((n) => n.level === 'D1')).toMatchObject({ unread: true, resolution: null });
  expect((await s.call('GET', `/milestones/${nextId}`)).status).toBe(404);
  // Đánh dấu lại, quá 15 s → không hoàn tác được.
  const again = await s.call('POST', `/milestones/${m.id as string}/complete`, {
    doneOn: '2026-11-14',
  });
  expect(again.status).toBe(200);
  await advanceClock(16_000);
  const late = await s.call('POST', `/milestones/${m.id as string}/undo-complete`);
  expect(late.status).toBe(409);
  expect(late.body.code).toBe('UNDO_WINDOW_EXPIRED');

  // 8. 07/11/2027 → D7 của mốc năm sau (vòng lặp chạy tiếp).
  // Phiên 30 ngày đã hết sau 1 năm → đăng nhập lại (401 là đúng).
  await setClock(vn('2027-11-07'));
  expect((await s.call('GET', '/notifications/summary')).status).toBe(401);
  const s2 = await ApiSession.login(s.email);
  app = await s2.openApp();
  expect(app.summary.banner.top).toMatchObject({ level: 'D7', dueOn: '2027-11-14' });
  await s.dispose();
  await s2.dispose();
});
