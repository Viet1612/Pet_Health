// Bản tin (F-08) và tìm người (F-07) trên PostgreSQL 16 thật (Testcontainers, cần Docker).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  activityRepository,
  engagementRepository,
} from '../src/modules/social/adapters/persistence/engagement.repository.js';
import { blockRepository } from '../src/modules/social/adapters/persistence/block.repository.js';
import { followRepository } from '../src/modules/social/adapters/persistence/follow.repository.js';
import { profileRepository } from '../src/modules/social/adapters/persistence/profile.repository.js';
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

describe('tim, bình luận, thông báo hoạt động (F-09, F-11)', () => {
  it('10 lần thả tim song song → 1 dòng tim, 1 thông báo; tự thích bài mình không báo', async () => {
    const postId = await addPost(C, 300);
    await Promise.all(
      Array.from({ length: 10 }, () =>
        withUserTx(env.appDb, A, (trx) => engagementRepository.like(trx, postId, A, new Date())),
      ),
    );
    await Promise.all(
      Array.from({ length: 10 }, () =>
        withUserTx(env.appDb, A, (trx) =>
          activityRepository.add(trx, {
            ownerId: C,
            actorId: A,
            kind: 'LIKE',
            postId,
            now: new Date(),
          }),
        ),
      ),
    );
    await withUserTx(env.appDb, C, (trx) =>
      activityRepository.add(trx, {
        ownerId: C,
        actorId: C,
        kind: 'LIKE',
        postId,
        now: new Date(),
      }),
    );
    expect(
      await withUserTx(env.appDb, A, (trx) => engagementRepository.likeCount(trx, postId)),
    ).toBe(1);
    expect(await withUserTx(env.appDb, C, (trx) => activityRepository.unreadCount(trx, C))).toBe(1);
  });

  it('nhiều người thích một bài → một dòng gộp; người khác không đọc được thông báo của C', async () => {
    const postId = await addPost(C, 301);
    for (const actor of [A, B, D]) {
      await withUserTx(env.appDb, actor, (trx) =>
        activityRepository.add(trx, {
          ownerId: C,
          actorId: actor,
          kind: 'LIKE',
          postId,
          now: new Date(),
        }),
      );
    }
    const rows = await withUserTx(env.appDb, C, (trx) => activityRepository.list(trx, C, null, 30));
    const row = rows.find((r) => r.post_id === postId);
    expect(row).toMatchObject({ kind: 'LIKE', actor_count: 3, unread: true });
    expect(row?.actors).toHaveLength(3);
    expect(
      await withUserTx(env.appDb, A, (trx) => activityRepository.list(trx, C, null, 30)),
    ).toEqual([]);
  });
});

describe('chặn (F-12)', () => {
  it('B chặn C: xóa follow hai chiều, ẩn tim + bình luận của C trên bài B (cả người thứ ba); bỏ chặn thì hiện lại, follow không khôi phục', async () => {
    const postB = await addPost(B, 400);
    await env.workerDb
      .insertInto('follows')
      .values([
        { follower_id: B, followee_id: C, created_at: new Date() },
        { follower_id: C, followee_id: B, created_at: new Date() },
      ])
      .onConflict((oc) => oc.doNothing())
      .execute();
    await withUserTx(env.appDb, C, async (trx) => {
      await engagementRepository.like(trx, postB, C, new Date());
      await engagementRepository.insertComment(trx, {
        id: newId(),
        postId: postB,
        ownerId: C,
        body: 'hi',
        now: new Date(),
      });
    });

    await withUserTx(env.appDb, B, async (trx) => {
      await blockRepository.cleanup(trx, B, C);
      await blockRepository.block(trx, B, C, new Date());
    });

    const left = await env.workerDb
      .selectFrom('follows')
      .select('follower_id')
      .where((eb) =>
        eb.or([
          eb.and([eb('follower_id', '=', B), eb('followee_id', '=', C)]),
          eb.and([eb('follower_id', '=', C), eb('followee_id', '=', B)]),
        ]),
      )
      .execute();
    expect(left).toEqual([]);
    // Dữ liệu vẫn còn (ẩn), nhưng người thứ ba (A) không thấy tim / bình luận của C trên bài B.
    const raw = await env.workerDb
      .selectFrom('post_likes')
      .select('hidden_by_block')
      .where('post_id', '=', postB)
      .execute();
    expect(raw).toEqual([{ hidden_by_block: true }]);
    const seenByThird = () =>
      withUserTx(env.appDb, A, async (trx) => ({
        likes: await engagementRepository.likeCount(trx, postB),
        comments: (await engagementRepository.comments(trx, postB, null, 20)).length,
      }));
    expect(await seenByThird()).toEqual({ likes: 0, comments: 0 });

    // C không thấy hồ sơ / bài của B, không tìm ra B; B vẫn thấy hồ sơ C và tìm ra C (để bỏ chặn).
    const byC = await withUserTx(env.appDb, C, async (trx) => ({
      profile: await trx
        .selectFrom('profiles')
        .select('user_id')
        .where('user_id', '=', B)
        .execute(),
      post: await trx.selectFrom('posts').select('id').where('id', '=', postB).execute(),
      search: await followRepository.search(trx, C, 'mochi.cute', 20),
    }));
    expect(byC).toEqual({ profile: [], post: [], search: [] });
    const byB = await withUserTx(env.appDb, B, async (trx) => ({
      profile: await trx
        .selectFrom('profiles')
        .select('user_id')
        .where('user_id', '=', C)
        .execute(),
      search: await followRepository.search(trx, B, 'carol', 20),
    }));
    expect(byB.profile).toEqual([{ user_id: C }]);
    expect(byB.search.map((r) => [r.username, r.blocked_by_me])).toEqual([['carol', true]]);

    await withUserTx(env.appDb, B, async (trx) => {
      await blockRepository.unblock(trx, B, C);
      await blockRepository.setHidden(trx, B, C, false);
    });
    expect(await seenByThird()).toEqual({ likes: 1, comments: 1 });
    const after = await withUserTx(env.appDb, C, (trx) =>
      followRepository.search(trx, C, 'mochi.cute', 20),
    );
    expect(after.map((r) => r.username)).toEqual(['mochi.cute']);
    expect(await withUserTx(env.appDb, C, (trx) => profileRepository.isFollowing(trx, C, B))).toBe(
      false,
    );
  });
});
