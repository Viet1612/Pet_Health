// Bản tin (F-08) và tìm người (F-07) trên PostgreSQL 16 thật (Testcontainers, cần Docker).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { followRepository } from '../src/modules/social/adapters/persistence/follow.repository.js';
import { postRepository } from '../src/modules/social/adapters/persistence/post.repository.js';
import { withUserTx } from '../src/platform/db/with-user-tx.js';
import { newId } from '../src/platform/ids.js';
import { startIdorDb, type IdorDb } from './idor/setup.js';

let env: IdorDb;
const A = newId();
const B = newId();
const C = newId();
const D = newId();
const BASE = new Date('2026-10-01T00:00:00Z').getTime();
const MIN = 60_000;

async function addPost(owner: string, minute: number): Promise<string> {
  const id = newId();
  const at = new Date(BASE + minute * MIN);
  await env.workerDb
    .insertInto('posts')
    .values({
      id,
      owner_id: owner,
      photo_count: 1,
      status: 'PUBLISHED',
      published_at: at,
      created_at: at,
      updated_at: at,
    })
    .execute();
  return id;
}

beforeAll(async () => {
  env = await startIdorDb();
  const people = [
    [A, 'alice', 'Alice'],
    [B, 'mochi.cute', 'Bé Bơ'],
    [C, 'carol', 'Mèo Mochi'],
    [D, 'dave', 'Hồ Văn D'],
  ] as const;
  for (const [id, username, displayName] of people) {
    await env.workerDb
      .insertInto('users')
      .values({ id, email: `${username}@example.test`, password_hash: 'x' })
      .execute();
    await env.workerDb
      .insertInto('profiles')
      .values({
        user_id: id,
        username,
        display_name: displayName,
        created_at: new Date(BASE),
        updated_at: new Date(BASE),
      })
      .execute();
  }
  // A theo dõi B, C (không theo dõi D). 30 bài xen kẽ A, B, C + 5 bài của D.
  for (const followee of [B, C]) {
    await env.workerDb
      .insertInto('follows')
      .values({ follower_id: A, followee_id: followee, created_at: new Date(BASE) })
      .execute();
  }
  const owners = [A, B, C];
  for (let i = 0; i < 30; i++) await addPost(owners[i % 3] ?? A, i);
  for (let i = 0; i < 5; i++) await addPost(D, 100 + i);
}, 180_000);

afterAll(async () => {
  await env.close();
}, 60_000);

describe('bản tin', () => {
  it('chỉ bài của mình và người theo dõi, mới nhất trước; phân trang không trùng, không sót kể cả khi có bài mới chen vào', async () => {
    const seen: string[] = [];
    let after: { createdAt: Date; id: string } | null = null;
    for (let page = 0; page < 10; page++) {
      const rows = await withUserTx(env.appDb, A, (trx) => postRepository.feed(trx, A, after, 7));
      if (page === 1) await addPost(B, 200); // bài mới đăng giữa lúc cuộn
      if (rows.length === 0) break;
      seen.push(...rows.map((r) => r.id));
      const times = rows.map((r) => r.created_at.getTime());
      expect([...times].sort((x, y) => y - x)).toEqual(times);
      expect(rows.every((r) => r.owner_id !== D)).toBe(true);
      const last = rows.at(-1);
      if (!last) break;
      after = { createdAt: last.created_at, id: last.id };
    }
    expect(seen).toHaveLength(30);
    expect(new Set(seen).size).toBe(30);
    const fresh = await withUserTx(env.appDb, A, (trx) =>
      postRepository.feedNewCount(trx, A, new Date(BASE + 150 * MIN)),
    );
    expect(fresh).toBe(1);
  });

  it('bỏ theo dõi B → không còn bài của B', async () => {
    await withUserTx(env.appDb, A, (trx) => followRepository.unfollow(trx, A, B));
    const rows = await withUserTx(env.appDb, A, (trx) => postRepository.feed(trx, A, null, 50));
    expect(rows.some((r) => r.owner_id === B)).toBe(false);
    expect(rows.some((r) => r.owner_id === C)).toBe(true);
  });
});

describe('theo dõi và tìm người', () => {
  it('10 request theo dõi song song chỉ tạo 1 dòng', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        withUserTx(env.appDb, D, (trx) => followRepository.follow(trx, D, C, new Date())),
      ),
    );
    const n = await withUserTx(env.appDb, D, (trx) => followRepository.followerCount(trx, C));
    expect(n).toBe(2); // A (từ trước) + D đúng một lần
  });

  it('tìm "mochi" ra @mochi.cute và "Mèo Mochi"; "ho" khớp "Hồ"; không tìm theo email', async () => {
    const search = (q: string) =>
      withUserTx(env.appDb, A, (trx) => followRepository.search(trx, A, q, 20));
    expect((await search('mochi')).map((r) => r.username).sort()).toEqual(['carol', 'mochi.cute']);
    expect((await search('mochi.cute'))[0]?.username).toBe('mochi.cute');
    expect((await search('ho')).map((r) => r.username)).toEqual(['dave']);
    expect(await search('example.test')).toEqual([]);
    expect(await search('%')).toEqual([]);
  });
});
