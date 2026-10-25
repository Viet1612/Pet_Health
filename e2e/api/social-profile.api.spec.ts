// Hồ sơ công khai (F-02): nickname + ngày sinh khi đăng ký, tạo/sửa hồ sơ, xem hồ sơ người khác.
import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { advanceClock, ApiSession, resetClock, setClock } from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

const uname = () => `e2e_${randomUUID().slice(0, 8)}`;

test('đăng ký trả nickname + ngày sinh; PATCH /me sửa được; ngày tương lai → 422', async () => {
  const s = await ApiSession.register({ nickname: 'Mẹ Mochi', birthDate: '1995-03-08' });
  const me = await s.call('GET', '/me');
  expect(me.body.user).toMatchObject({ nickname: 'Mẹ Mochi', birthDate: '1995-03-08' });
  const ok = await s.call('PATCH', '/me', { nickname: '  Bố Mochi ', birthDate: '1990-01-01' });
  expect(ok.body.user).toMatchObject({ nickname: 'Bố Mochi', birthDate: '1990-01-01' });
  const future = await s.call('PATCH', '/me', { birthDate: '2999-01-01' });
  expect(future.status).toBe(422);
  expect(future.body.errors[0]).toMatchObject({ field: 'birthDate', code: 'FUTURE_DATE' });
  await s.dispose();
});

test('hồ sơ: chưa có → 404; tạo; người khác xem được (không có email); trùng username → 409', async () => {
  const a = await ApiSession.register();
  const b = await ApiSession.register();
  expect((await a.call('GET', '/me/profile')).body.code).toBe('PROFILE_NOT_SET');
  // Chưa có hồ sơ thì không đặt được ảnh.
  expect((await a.call('DELETE', '/me/avatar')).status).toBe(404);

  const name = uname();
  const created = await a.call('PUT', '/me/profile', {
    username: name.toUpperCase(),
    displayName: 'Mochi Mom',
    bio: 'Yêu chó',
  });
  expect(created.status).toBe(200);
  expect(created.body.profile).toMatchObject({ username: name, usernameChangeInDays: 0 });

  const seen = await b.call('GET', `/profiles/${name}`);
  expect(seen.status).toBe(200);
  expect(seen.body.profile).toMatchObject({
    username: name,
    displayName: 'Mochi Mom',
    isMe: false,
    postCount: 0,
  });
  expect(JSON.stringify(seen.body)).not.toContain(a.email);

  expect((await b.call('GET', `/profiles/check?username=${name}`)).body).toEqual({
    valid: true,
    available: false,
  });
  expect((await b.call('GET', '/profiles/check?username=ad')).body.valid).toBe(false);

  const taken = await b.call('PUT', '/me/profile', { username: name, displayName: 'B' });
  expect(taken.status).toBe(409);
  expect(taken.body.code).toBe('USERNAME_TAKEN');
  const reserved = await b.call('PUT', '/me/profile', { username: 'admin', displayName: 'B' });
  expect(reserved.body.errors[0]).toMatchObject({ field: 'username', code: 'USERNAME_RESERVED' });
  expect((await b.call('GET', '/profiles/khong_ton_tai_xyz')).status).toBe(404);
  await a.dispose();
  await b.dispose();
});

test('đổi username: lần đầu được ngay, lần sau phải chờ 14 ngày', async () => {
  await setClock('2026-11-01T02:00:00Z');
  const s = await ApiSession.register();
  await s.call('PUT', '/me/profile', { username: uname(), displayName: 'S' });
  const first = await s.call('PUT', '/me/profile', { username: uname(), displayName: 'S' });
  expect(first.status).toBe(200);
  expect(first.body.profile.usernameChangeInDays).toBe(14);
  const again = await s.call('PUT', '/me/profile', { username: uname(), displayName: 'S' });
  expect(again.status).toBe(429);
  expect(again.body).toMatchObject({ code: 'USERNAME_CHANGE_TOO_SOON', params: { days: 14 } });
  // Sửa tên hiển thị (giữ username) vẫn được.
  const same = await s.call('PUT', '/me/profile', {
    username: first.body.profile.username,
    displayName: 'Tên mới',
  });
  expect(same.status).toBe(200);
  await advanceClock(14 * 86_400_000);
  expect((await s.call('PUT', '/me/profile', { username: uname(), displayName: 'S' })).status).toBe(
    200,
  );
  await s.dispose();
});
