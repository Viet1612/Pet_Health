// Nhóm /me (S6-01): múi giờ, đổi mật khẩu, đổi email có xác nhận, xóa tài khoản.
import { expect, test } from '@playwright/test';

import {
  advanceClock,
  ApiSession,
  newEmail,
  PASSWORD,
  resetClock,
  setClock,
  tokenOf,
  verificationLink,
  vn,
} from '../support/api';
import { MAILPIT_URL } from '../support/env';

test.afterEach(async () => {
  await resetClock();
});

test('PATCH /me: múi giờ hợp lệ đổi "hôm nay"; GMT+7, Asia/Hanoi → 422 INVALID_TIMEZONE', async () => {
  await setClock('2026-11-14T20:00:00Z'); // 03:00 ngày 15 giờ VN, 15:00 ngày 14 giờ New York
  const s = await ApiSession.register();
  expect((await s.call('GET', '/dashboard')).body.today).toBe('2026-11-15');
  const ok = await s.call('PATCH', '/me', { timezone: 'America/New_York' });
  expect(ok.status).toBe(200);
  expect(ok.body.user.timezone).toBe('America/New_York');
  expect((await s.call('GET', '/dashboard')).body.today).toBe('2026-11-14');

  for (const tz of ['GMT+7', 'Asia/Hanoi', '']) {
    const bad = await s.call('PATCH', '/me', { timezone: tz });
    expect(bad.status).toBe(422);
    expect(bad.body.errors[0]).toMatchObject({ field: 'timezone', code: 'INVALID_TIMEZONE' });
  }
  // Body strict: trường lạ bị từ chối.
  expect((await s.call('PATCH', '/me', { timezone: 'UTC', id: 'x' })).status).toBe(422);
  await s.dispose();
});

test('đổi mật khẩu: phiên A giữ, phiên B bị hủy; sai 5 lần → lần 6 nhận 429', async () => {
  await setClock(vn('2026-11-14'));
  const a = await ApiSession.register();
  const b = await ApiSession.login(a.email);

  const wrong = await a.call('POST', '/me/password', {
    currentPassword: 'sai-mat-khau-1',
    newPassword: 'mat-khau-moi-123',
  });
  expect(wrong.status).toBe(401);
  expect(wrong.body.code).toBe('WRONG_PASSWORD');

  const ok = await a.call('POST', '/me/password', {
    currentPassword: PASSWORD,
    newPassword: 'mat-khau-moi-123',
  });
  expect(ok.status).toBe(204);
  expect((await a.call('GET', '/me')).status).toBe(200);
  expect((await b.call('GET', '/me')).status).toBe(401);

  // Đã sai 1 lần ở trên; thêm 4 lần → 401, lần tiếp theo → 429.
  for (let i = 0; i < 4; i += 1) {
    const r = await a.call('POST', '/me/password', {
      currentPassword: `sai-${String(i)}`,
      newPassword: 'mat-khau-khac-123',
    });
    expect(r.status).toBe(401);
  }
  const limited = await a.call('POST', '/me/password', {
    currentPassword: 'sai-nua',
    newPassword: 'mat-khau-khac-123',
  });
  expect(limited.status).toBe(429);
  await a.dispose();
  await b.dispose();
});

test('đổi email: 202 → pendingEmail → mở liên kết → email đổi, email cũ nhận thông báo', async () => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const oldEmail = s.email;
  const target = newEmail();

  expect(
    (await s.call('POST', '/me/email', { newEmail: oldEmail, password: PASSWORD })).body.errors[0]
      .code,
  ).toBe('SAME_EMAIL');
  const other = await ApiSession.register();
  expect(
    (await s.call('POST', '/me/email', { newEmail: other.email, password: PASSWORD })).status,
  ).toBe(409);

  expect((await s.call('POST', '/me/email', { newEmail: target, password: PASSWORD })).status).toBe(
    202,
  );
  const me = await s.call('GET', '/me');
  expect(me.body.user).toMatchObject({ email: oldEmail, pendingEmail: target });

  const link = await verificationLink(target);
  const verified = await s.call('POST', '/auth/verify-email', { token: tokenOf(link) });
  expect(verified.status).toBe(200);
  expect(verified.body).toMatchObject({
    purpose: 'CHANGE_EMAIL',
    user: { email: target, emailVerified: true },
  });
  expect((await s.call('POST', '/auth/verify-email', { token: tokenOf(link) })).body.code).toBe(
    'TOKEN_USED',
  );

  // Email cũ nhận thư "Email tài khoản vừa được đổi" (email mới đã che).
  let subject = '';
  for (let i = 0; i < 60 && !subject.includes('vừa được đổi'); i += 1) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${oldEmail}"`)}`,
    );
    const found = (await res.json()) as { messages?: { Subject: string }[] };
    subject = found.messages?.map((m) => m.Subject).join(' | ') ?? '';
    if (!subject.includes('vừa được đổi')) await new Promise((r) => setTimeout(r, 500));
  }
  expect(subject).toContain('Email tài khoản vừa được đổi');
  await s.dispose();
  await other.dispose();
});

test('liên kết đổi email hết hạn sau 60 phút', async () => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const target = newEmail();
  await s.call('POST', '/me/email', { newEmail: target, password: PASSWORD });
  const link = await verificationLink(target);
  await advanceClock(61 * 60 * 1000);
  expect((await s.call('POST', '/auth/verify-email', { token: tokenOf(link) })).body.code).toBe(
    'TOKEN_EXPIRED',
  );
  await s.dispose();
});

test('xóa tài khoản: sai mật khẩu → 401 không xóa; đúng → 204, phiên chết, đăng nhập lại 401', async () => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const petId = await s.createPet();
  await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });
  await s.call(
    'POST',
    `/pets/${petId}/routines`,
    { name: 'Cho ăn', timeOfDay: '07:00' },
    { idempotent: true },
  );

  expect((await s.call('DELETE', '/me', { password: 'sai-mat-khau' })).status).toBe(401);
  expect((await s.call('GET', `/pets/${petId}`)).status).toBe(200);

  const del = await s.call('DELETE', '/me', { password: PASSWORD });
  expect(del.status).toBe(204);
  expect(del.headers['set-cookie']).toMatch(/Max-Age=0/i);
  expect((await s.call('GET', '/me')).status).toBe(401);
  await expect(ApiSession.login(s.email)).rejects.toThrow(/401/);
  await s.dispose();
});

test('đổi múi giờ: giờ việc hằng ngày được quy đổi sang múi mới', async () => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const petId = await s.createPet();
  await s.call(
    'POST',
    `/pets/${petId}/routines`,
    { name: 'Cho ăn', timeOfDay: '07:00' },
    { idempotent: true },
  );
  expect((await s.call('PATCH', '/me', { timezone: 'UTC' })).status).toBe(200);
  const list = await s.call('GET', `/pets/${petId}/routines`);
  expect(list.body.items[0]?.timeOfDay).toBe('00:00');
  // Đổi lại về VN → 07:00 như cũ.
  await s.call('PATCH', '/me', { timezone: 'Asia/Ho_Chi_Minh' });
  expect((await s.call('GET', `/pets/${petId}/routines`)).body.items[0]?.timeOfDay).toBe('07:00');
  await s.dispose();
});
