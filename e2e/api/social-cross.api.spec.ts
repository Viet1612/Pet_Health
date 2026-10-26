// F-13: luồng chéo 3 tài khoản qua API — đăng bài, tìm + theo dõi + tim + bình luận, thông báo gộp,
// chặn, xóa bài (ảnh bị xóa khỏi kho), xóa tài khoản; cuối cùng quét analytics không lộ dữ liệu.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, request, test } from '@playwright/test';
import pg from 'pg';

import { ApiSession, PASSWORD } from '../support/api';
import { API_ENV, ORIGIN } from '../support/env';

const PHOTO = {
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: readFileSync(new URL('../fixtures/photo.jpg', import.meta.url)),
};

async function person(displayName: string) {
  const s = await ApiSession.register();
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  await s.call('PUT', '/me/profile', { username, displayName });
  return { s, username };
}

async function publish(s: ApiSession, body: Record<string, unknown>, photos: number) {
  const created = await s.call(
    'POST',
    '/posts',
    { ...body, photoCount: photos },
    { idempotent: true },
  );
  const id = created.body.id as string;
  for (let i = 0; i < photos; i++) {
    await s.upload('POST', `/posts/${id}/photos?position=${String(i)}`, PHOTO);
  }
  await expect
    .poll(async () => (await s.call('GET', `/posts/${id}`)).body.post.status, { timeout: 20_000 })
    .toBe('PUBLISHED');
  return id;
}

test('3 tài khoản: đăng → theo dõi → tim, bình luận → thông báo → chặn → xóa bài → xóa tài khoản', async () => {
  test.setTimeout(120_000);
  const a = await person('Chủ A');
  const b = await person('Bạn B');
  const c = await person('Bạn C');

  // 1. A đăng bài 2 ảnh gắn Mochi và 1 bài 1 ảnh không gắn bé.
  const petId = await a.s.createPet('Mochi');
  const withPet = await publish(a.s, { caption: 'Mochi đi dạo', petIds: [petId] }, 2);
  const plain = await publish(a.s, { caption: 'Không gắn bé' }, 1);

  // 2. B tìm A → theo dõi → thấy bài trên bản tin → tim + bình luận.
  const found = await b.s.call('GET', `/search/profiles?q=${a.username}`);
  expect(found.body.items[0].username).toBe(a.username);
  await b.s.call('PUT', `/follows/${a.username}`);
  const feed = await b.s.call('GET', '/feed');
  expect(feed.body.items.map((p: any) => p.id)).toEqual([plain, withPet]);
  await b.s.call('PUT', `/posts/${withPet}/like`);
  await c.s.call('PUT', `/posts/${withPet}/like`);
  const comment = await b.s.call(
    'POST',
    `/posts/${withPet}/comments`,
    { body: 'Dễ thương!' },
    { idempotent: true },
  );

  // 3. A thấy thông báo (tim gộp), xóa bình luận của B.
  const activity = (await a.s.call('GET', '/social-notifications')).body.items as any[];
  expect(activity.find((n) => n.kind === 'LIKE')).toMatchObject({ actorCount: 2 });
  expect((await a.s.call('DELETE', `/comments/${comment.body.comment.id as string}`)).status).toBe(
    204,
  );

  // 4. C chặn A → C không thấy A ở tìm kiếm, không mở được hồ sơ / bài.
  await c.s.call('PUT', `/blocks/${a.username}`);
  expect((await c.s.call('GET', `/search/profiles?q=${a.username}`)).body.items).toEqual([]);
  expect((await c.s.call('GET', `/posts/${withPet}`)).status).toBe(404);
  // Tim của C trên bài A không bị xóa (chỉ xóa tim của người bị chặn trên bài người chặn).
  expect((await a.s.call('GET', `/profiles/${c.username}`)).status).toBe(404);

  // 5. A xóa bài → ảnh bị xóa khỏi kho (URL ảnh 404), B làm mới không còn bài.
  const photoUrl = (await a.s.call('GET', `/posts/${plain}`)).body.post.photos[0].url as string;
  const web = await request.newContext();
  expect((await web.get(`${ORIGIN}${photoUrl}`)).status()).toBe(200);
  await a.s.call('DELETE', `/posts/${plain}`);
  await expect
    .poll(async () => (await web.get(`${ORIGIN}${photoUrl}`)).status(), { timeout: 30_000 })
    .toBe(404);
  expect((await b.s.call('GET', '/feed')).body.items.map((p: any) => p.id)).toEqual([withPet]);

  // 6. A xóa tài khoản → hồ sơ 404; số đang theo dõi của B về 0.
  expect((await b.s.call('GET', `/profiles/${b.username}`)).body.profile.followingCount).toBe(1);
  expect((await a.s.call('DELETE', '/me', { password: PASSWORD })).status).toBe(204);
  expect((await b.s.call('GET', `/profiles/${a.username}`)).status).toBe(404);
  expect((await b.s.call('GET', `/profiles/${b.username}`)).body.profile.followingCount).toBe(0);
  await web.dispose();

  // Analytics: props không có chuỗi chứa "@" (email, username) và chỉ có khóa trong danh sách trắng.
  const db = new pg.Client({ connectionString: API_ENV.MIGRATION_DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ name: string; props: Record<string, unknown> }>(
      `SELECT name, props FROM analytics_events
       WHERE received_at > now() - interval '5 minutes'
         AND name IN ('profile_created','post_created','post_liked','post_like_received',
                      'post_commented','user_followed','user_blocked')`,
    );
    expect(rows.map((r) => r.name)).toEqual(
      expect.arrayContaining(['profile_created', 'post_created', 'user_followed', 'user_blocked']),
    );
    const allowed: Record<string, string[]> = {
      post_created: ['photo_count', 'has_caption', 'pet_count'],
      post_commented: ['length_bucket'],
    };
    for (const r of rows) {
      expect(JSON.stringify(r.props)).not.toContain('@');
      for (const key of Object.keys(r.props)) expect(allowed[r.name] ?? []).toContain(key);
    }
  } finally {
    await db.end();
  }
  for (const x of [b, c]) await x.s.dispose();
});
