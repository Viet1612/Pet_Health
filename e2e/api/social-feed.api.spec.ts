// Theo dõi, tìm người (F-07) và bản tin (F-08) qua API.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { ApiSession } from '../support/api';

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

async function post(s: ApiSession, caption: string): Promise<string> {
  const created = await s.call('POST', '/posts', { caption, photoCount: 1 }, { idempotent: true });
  const id = created.body.id as string;
  await s.upload('POST', `/posts/${id}/photos?position=0`, PHOTO);
  await expect
    .poll(async () => (await s.call('GET', `/posts/${id}`)).body.post.status, { timeout: 20_000 })
    .toBe('PUBLISHED');
  return id;
}

test('theo dõi idempotent, tự theo dõi → 422, bỏ theo dõi 2 lần không lỗi; danh sách', async () => {
  const a = await person('Người A');
  const b = await person('Người B');

  const results = await Promise.all(
    Array.from({ length: 5 }, () => a.s.call('PUT', `/follows/${b.username}`)),
  );
  expect(results.every((r) => r.status === 200)).toBe(true);
  expect((await a.s.call('GET', `/profiles/${b.username}`)).body.profile).toMatchObject({
    followerCount: 1,
    followedByMe: true,
  });
  expect((await a.s.call('PUT', `/follows/${a.username}`)).body.errors[0].code).toBe(
    'CANNOT_FOLLOW_SELF',
  );

  const followers = await b.s.call('GET', `/profiles/${b.username}/followers`);
  expect(followers.body.items.map((p: any) => p.username)).toEqual([a.username]);
  const following = await b.s.call('GET', `/profiles/${a.username}/following`);
  expect(following.body.items[0]).toMatchObject({ username: b.username, isMe: true });

  for (let i = 0; i < 2; i++) {
    const res = await a.s.call('DELETE', `/follows/${b.username}`);
    expect(res.body).toEqual({ following: false, followerCount: 0 });
  }
  expect((await a.s.call('PUT', '/follows/khong_ton_tai_xyz')).status).toBe(404);
  await a.s.dispose();
  await b.s.dispose();
});

test('tìm người: không dấu, theo username và tên; không trả email', async () => {
  const a = await person('Người tìm');
  const tag = randomUUID().slice(0, 6);
  const b = await person(`Mèo Hồ ${tag}`);
  const byName = await a.s.call('GET', `/search/profiles?q=${encodeURIComponent(`meo ho ${tag}`)}`);
  expect(byName.body.items.map((p: any) => p.username)).toEqual([b.username]);
  const byUser = await a.s.call('GET', `/search/profiles?q=${b.username}`);
  expect(byUser.body.items[0].username).toBe(b.username);
  expect(JSON.stringify(byUser.body)).not.toContain(b.s.email);
  expect(
    (await a.s.call('GET', `/search/profiles?q=${encodeURIComponent(b.s.email)}`)).body.items,
  ).toEqual([]);
  expect((await a.s.call('GET', '/search/profiles?q=')).status).toBe(422);
  await a.s.dispose();
  await b.s.dispose();
});

test('bản tin: bài của mình + người theo dõi, mới nhất trước; bỏ theo dõi thì mất bài', async () => {
  const a = await person('A');
  const b = await person('B');
  const d = await person('D');
  await a.s.call('PUT', `/follows/${b.username}`);
  const since = new Date().toISOString();
  const pa = await post(a.s, 'Bài của A');
  const pb = await post(b.s, 'Bài của B');
  await post(d.s, 'Bài của D');

  const feed = await a.s.call('GET', '/feed');
  expect(feed.body.items.map((p: any) => p.id)).toEqual([pb, pa]);
  expect(
    (await a.s.call('GET', `/feed/new-count?since=${encodeURIComponent(since)}`)).body.count,
  ).toBe(1);

  await a.s.call('DELETE', `/follows/${b.username}`);
  expect((await a.s.call('GET', '/feed')).body.items.map((p: any) => p.id)).toEqual([pa]);
  for (const x of [a, b, d]) await x.s.dispose();
});
