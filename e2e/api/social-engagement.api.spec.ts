// Tim, bình luận (F-09) và thông báo hoạt động (F-11) qua API.
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

async function post(s: ApiSession): Promise<string> {
  const created = await s.call('POST', '/posts', { photoCount: 1 }, { idempotent: true });
  const id = created.body.id as string;
  await s.upload('POST', `/posts/${id}/photos?position=0`, PHOTO);
  await expect
    .poll(async () => (await s.call('GET', `/posts/${id}`)).body.post.status, { timeout: 20_000 })
    .toBe('PUBLISHED');
  return id;
}

test('tim idempotent (song song), bỏ tim, tự thích không báo; danh sách người thích', async () => {
  const a = await person('A');
  const b = await person('B');
  const id = await post(a.s);

  const many = await Promise.all(
    Array.from({ length: 10 }, () => b.s.call('PUT', `/posts/${id}/like`)),
  );
  expect(many.every((r) => r.status === 200)).toBe(true);
  expect((await a.s.call('GET', `/posts/${id}`)).body.post.likeCount).toBe(1);
  expect((await b.s.call('GET', `/posts/${id}`)).body.post.likedByMe).toBe(true);
  expect(
    (await a.s.call('GET', `/posts/${id}/likes`)).body.items.map((p: any) => p.username),
  ).toEqual([b.username]);

  await a.s.call('PUT', `/posts/${id}/like`); // tự thích: không tạo thông báo
  for (let i = 0; i < 2; i++) {
    expect((await b.s.call('DELETE', `/posts/${id}/like`)).body).toEqual({
      liked: false,
      likeCount: 1,
    });
  }
  await b.s.call('PUT', `/posts/${id}/like`); // thích lại: không thêm thông báo
  const activity = await a.s.call('GET', '/social-notifications');
  expect(activity.body.items.filter((n: any) => n.kind === 'LIKE')).toHaveLength(1);
  await a.s.dispose();
  await b.s.dispose();
});

test('bình luận: kiểm nội dung, B viết, A (chủ bài) xóa được, C không xóa được', async () => {
  const a = await person('A');
  const b = await person('B');
  const c = await person('C');
  const id = await post(a.s);

  const empty = await b.s.call(
    'POST',
    `/posts/${id}/comments`,
    { body: '   ' },
    { idempotent: true },
  );
  expect(empty.status).toBe(422);
  const long = await b.s.call(
    'POST',
    `/posts/${id}/comments`,
    { body: 'x'.repeat(501) },
    { idempotent: true },
  );
  expect(long.body.errors[0]).toMatchObject({ code: 'TOO_LONG', params: { max: 500 } });

  const created = await b.s.call(
    'POST',
    `/posts/${id}/comments`,
    { body: ' Dễ thương quá ' },
    { idempotent: true },
  );
  expect(created.status).toBe(201);
  expect(created.body.comment).toMatchObject({ body: 'Dễ thương quá', canDelete: true });
  const commentId = created.body.comment.id as string;

  const list = await c.s.call('GET', `/posts/${id}/comments`);
  expect(list.body.items).toHaveLength(1);
  expect(list.body.items[0].canDelete).toBe(false);
  expect((await a.s.call('GET', `/posts/${id}`)).body.post.commentCount).toBe(1);

  expect((await c.s.call('DELETE', `/comments/${commentId}`)).status).toBe(404);
  expect((await a.s.call('DELETE', `/comments/${commentId}`)).status).toBe(204);
  expect((await a.s.call('GET', `/posts/${id}/comments`)).body.items).toEqual([]);
  for (const x of [a, b, c]) await x.s.dispose();
});

test('thông báo: B, C thích (gộp 1 dòng), B bình luận, C theo dõi → 3 dòng; chuông đếm; đọc hết', async () => {
  const a = await person('A');
  const b = await person('B');
  const c = await person('C');
  const id = await post(a.s);
  await b.s.call('PUT', `/posts/${id}/like`);
  await c.s.call('PUT', `/posts/${id}/like`);
  await b.s.call('POST', `/posts/${id}/comments`, { body: 'Xinh quá' }, { idempotent: true });
  await c.s.call('PUT', `/follows/${a.username}`);

  const summary = await a.s.call('GET', '/notifications/summary');
  expect(summary.body.socialUnreadCount).toBe(4);
  const items = (await a.s.call('GET', '/social-notifications')).body.items as any[];
  expect(items.map((n) => n.kind)).toEqual(['FOLLOW', 'COMMENT', 'LIKE']);
  expect(items[2]).toMatchObject({ actorCount: 2, post: { id } });
  expect(items[1].commentExcerpt).toBe('Xinh quá');

  await a.s.call('POST', '/social-notifications/read-all', {});
  expect((await a.s.call('GET', '/notifications/summary')).body.socialUnreadCount).toBe(0);

  // Bỏ theo dõi → thông báo theo dõi chưa đọc mới bị xóa; đã đọc thì giữ.
  await c.s.call('DELETE', `/follows/${a.username}`);
  expect(
    ((await a.s.call('GET', '/social-notifications')).body.items as any[]).some(
      (n) => n.kind === 'FOLLOW',
    ),
  ).toBe(true);
  for (const x of [a, b, c]) await x.s.dispose();
});

test('chặn ẩn tim + bình luận của người bị chặn (cả với người thứ ba); bỏ chặn thì hiện lại', async () => {
  const a = await person('A');
  const b = await person('B');
  const c = await person('C');
  const id = await post(a.s);
  await b.s.call('PUT', `/posts/${id}/like`);
  await b.s.call('POST', `/posts/${id}/comments`, { body: 'Bé xinh' }, { idempotent: true });

  await a.s.call('PUT', `/blocks/${b.username}`);
  for (const viewer of [a.s, c.s]) {
    expect((await viewer.call('GET', `/posts/${id}`)).body.post).toMatchObject({
      likeCount: 0,
      commentCount: 0,
    });
  }
  expect((await c.s.call('GET', `/posts/${id}/comments`)).body.items).toEqual([]);
  // A vẫn tìm thấy B để bỏ chặn.
  const found = await a.s.call('GET', `/search/profiles?q=${b.username}`);
  expect(found.body.items[0]).toMatchObject({ username: b.username, blockedByMe: true });

  await a.s.call('DELETE', `/blocks/${b.username}`);
  expect((await c.s.call('GET', `/posts/${id}`)).body.post).toMatchObject({
    likeCount: 1,
    commentCount: 1,
  });
  expect((await a.s.call('GET', `/posts/${id}/comments`)).body.items[0].body).toBe('Bé xinh');
  for (const x of [a, b, c]) await x.s.dispose();
});
