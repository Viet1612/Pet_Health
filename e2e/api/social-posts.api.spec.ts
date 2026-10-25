// Bài đăng (F-04): tạo nháp → tải ảnh → worker xử lý → PUBLISHED; xem, sửa, xóa; lưới hồ sơ.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { ApiSession } from '../support/api';

const PHOTO = {
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: readFileSync(new URL('../fixtures/photo.jpg', import.meta.url)),
};

async function withProfile(): Promise<{ s: ApiSession; username: string }> {
  const s = await ApiSession.register();
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  const res = await s.call('PUT', '/me/profile', { username, displayName: 'Người đăng' });
  expect(res.status).toBe(200);
  return { s, username };
}

/** Chờ worker xử lý xong ảnh (tối đa 20 s). */
async function waitPublished(s: ApiSession, id: string): Promise<any> {
  for (let i = 0; i < 40; i++) {
    const res = await s.call('GET', `/posts/${id}`);
    if (res.body.post?.status === 'PUBLISHED') return res.body.post;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('bài chưa PUBLISHED sau 20 s');
}

test('đăng 2 ảnh gắn 1 thú cưng → PUBLISHED; người khác thấy tên bé, không thấy dữ liệu khác', async () => {
  const { s: a, username } = await withProfile();
  const b = await ApiSession.register();
  const petId = await a.createPet('Mochi');

  const created = await a.call(
    'POST',
    '/posts',
    { caption: ' Mochi đi dạo ', petIds: [petId], photoCount: 2 },
    { idempotent: true },
  );
  expect(created.status).toBe(201);
  const id = created.body.id as string;

  // Bài nháp: người khác không thấy, lưới chưa có.
  expect((await b.call('GET', `/posts/${id}`)).status).toBe(404);
  for (const position of [0, 1]) {
    const up = await a.upload('POST', `/posts/${id}/photos?position=${String(position)}`, PHOTO);
    expect(up.status, JSON.stringify(up.body)).toBe(202);
  }
  const post = await waitPublished(a, id);
  expect(post).toMatchObject({
    caption: 'Mochi đi dạo',
    pets: [{ id: petId, name: 'Mochi' }],
    photoCount: 2,
    isMine: true,
  });
  expect(post.photos.map((p: any) => [p.position, p.status, p.width])).toEqual([
    [0, 'READY', 1080],
    [1, 'READY', 1080],
  ]);

  const seen = await b.call('GET', `/posts/${id}`);
  expect(seen.body.post).toMatchObject({
    isMine: false,
    author: { username },
    pets: [{ name: 'Mochi' }],
  });
  const text = JSON.stringify(seen.body);
  for (const secret of [a.email, 'Poodle', 'birth']) expect(text).not.toContain(secret);

  const grid = await b.call('GET', `/profiles/${username}/posts`);
  expect(grid.body.items).toHaveLength(1);
  expect(grid.body.items[0]).toMatchObject({ id, photoCount: 2 });
  expect((await b.call('GET', `/profiles/${username}`)).body.profile.postCount).toBe(1);
  await a.dispose();
  await b.dispose();
});

test('không gắn thú cưng → pets []; gắn bé của người khác → 422 PET_NOT_OWNED', async () => {
  const { s: a } = await withProfile();
  const { s: b } = await withProfile();
  const created = await a.call('POST', '/posts', { photoCount: 1 }, { idempotent: true });
  await a.upload('POST', `/posts/${created.body.id as string}/photos?position=0`, PHOTO);
  expect((await waitPublished(a, created.body.id)).pets).toEqual([]);

  const otherPet = await b.createPet('Bơ');
  const bad = await a.call(
    'POST',
    '/posts',
    { petIds: [otherPet], photoCount: 1 },
    { idempotent: true },
  );
  expect(bad.status).toBe(422);
  expect(bad.body.errors[0]).toMatchObject({ field: 'petIds', code: 'PET_NOT_OWNED' });
  await a.dispose();
  await b.dispose();
});

test('sửa chú thích và bỏ gắn bé; người khác không sửa, xóa được; xóa bài → 404', async () => {
  const { s: a } = await withProfile();
  const { s: b } = await withProfile();
  const petId = await a.createPet('Mochi');
  const created = await a.call(
    'POST',
    '/posts',
    { petIds: [petId], photoCount: 1 },
    { idempotent: true },
  );
  const id = created.body.id as string;
  await a.upload('POST', `/posts/${id}/photos?position=0`, PHOTO);
  await waitPublished(a, id);

  const edited = await a.call('PATCH', `/posts/${id}`, { caption: 'Chú thích mới', petIds: [] });
  expect(edited.body.post).toMatchObject({ caption: 'Chú thích mới', pets: [] });
  expect((await b.call('PATCH', `/posts/${id}`, { caption: 'Bị sửa' })).status).toBe(404);
  expect((await b.call('DELETE', `/posts/${id}`)).status).toBe(404);
  expect((await b.call('GET', `/posts/${id}`)).body.post.caption).toBe('Chú thích mới');

  expect((await a.call('DELETE', `/posts/${id}`)).status).toBe(204);
  expect((await b.call('GET', `/posts/${id}`)).status).toBe(404);
  await a.dispose();
  await b.dispose();
});

test('chưa có hồ sơ → 409 PROFILE_NOT_SET; photoCount 6 → 422', async () => {
  const s = await ApiSession.register();
  const res = await s.call('POST', '/posts', { photoCount: 1 }, { idempotent: true });
  expect([res.status, res.body.code]).toEqual([409, 'PROFILE_NOT_SET']);
  await s.call('PUT', '/me/profile', {
    username: `e2e_${randomUUID().slice(0, 8)}`,
    displayName: 'S',
  });
  expect((await s.call('POST', '/posts', { photoCount: 6 }, { idempotent: true })).status).toBe(
    422,
  );
  await s.dispose();
});
