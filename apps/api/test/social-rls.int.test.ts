// RLS bảng mạng xã hội (F-03) trên PostgreSQL 16 thật (Testcontainers, cần Docker): đọc công khai
// cho người đã đăng nhập, ghi chỉ chủ, bài nháp chỉ chủ thấy, hai người chặn nhau không thấy nhau.
import type { Transaction } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '../src/platform/db/kysely.js';
import { withUserTx } from '../src/platform/db/with-user-tx.js';
import { newId } from '../src/platform/ids.js';
import { startIdorDb, type IdorDb } from './idor/setup.js';

let env: IdorDb;
const A = newId();
const B = newId();
const C = newId();
const NOW = new Date('2026-10-26T03:00:00Z');
const published = newId();
const draft = newId();

const as = <T>(userId: string, fn: (trx: Transaction<Database>) => Promise<T>): Promise<T> =>
  withUserTx(env.appDb, userId, fn);
const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

beforeAll(async () => {
  env = await startIdorDb();
  const w = env.workerDb;
  for (const [id, name] of [
    [A, 'alice'],
    [B, 'bob'],
    [C, 'carol'],
  ] as const) {
    await w
      .insertInto('users')
      .values({ id, email: `${name}@example.test`, password_hash: 'x', nickname: name })
      .execute();
    await w
      .insertInto('profiles')
      .values({
        user_id: id,
        username: name,
        display_name: name,
        created_at: NOW,
        updated_at: NOW,
      })
      .execute();
  }
  await w
    .insertInto('posts')
    .values([
      {
        id: published,
        owner_id: A,
        photo_count: 1,
        status: 'PUBLISHED',
        created_at: NOW,
        updated_at: NOW,
      },
      { id: draft, owner_id: A, photo_count: 1, status: 'DRAFT', created_at: NOW, updated_at: NOW },
    ])
    .execute();
}, 180_000);

afterAll(async () => {
  await env.close();
}, 60_000);

describe('RLS mạng xã hội', () => {
  it('chưa đặt app.user_id → không đọc được hồ sơ hay bài', async () => {
    const rows = await env.appDb.transaction().execute(async (trx) => ({
      profiles: await trx.selectFrom('profiles').select('user_id').execute(),
      posts: await trx.selectFrom('posts').select('id').execute(),
    }));
    expect(rows).toEqual({ profiles: [], posts: [] });
  });

  it('người khác thấy hồ sơ và bài đã đăng, không thấy bản nháp', async () => {
    const seen = await as(B, async (trx) => ({
      profiles: (await trx.selectFrom('profiles').select('user_id').execute()).length,
      posts: ids(await trx.selectFrom('posts').select('id').execute()),
    }));
    expect(seen.profiles).toBe(3);
    expect(seen.posts).toEqual([published]);
    const own = await as(A, (trx) => trx.selectFrom('posts').select('id').execute());
    expect(ids(own)).toEqual([published, draft].sort());
  });

  it('không sửa, xóa được hồ sơ hay bài của người khác', async () => {
    const res = await as(B, async (trx) => ({
      profile: await trx
        .updateTable('profiles')
        .set({ bio: 'bị sửa' })
        .where('user_id', '=', A)
        .executeTakeFirst(),
      post: await trx.deleteFrom('posts').where('id', '=', published).executeTakeFirst(),
    }));
    expect(res.profile.numUpdatedRows).toBe(0n);
    expect(res.post.numDeletedRows).toBe(0n);
  });

  it('không tạo bài hay theo dõi thay người khác', async () => {
    await expect(
      as(B, (trx) =>
        trx
          .insertInto('posts')
          .values({ id: newId(), owner_id: A, photo_count: 1, created_at: NOW, updated_at: NOW })
          .execute(),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(B, (trx) =>
        trx
          .insertInto('follows')
          .values({ follower_id: A, followee_id: C, created_at: NOW })
          .execute(),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('chặn nhau → hai bên không thấy hồ sơ và bài của nhau; người thứ ba vẫn thấy', async () => {
    await as(C, (trx) =>
      trx.insertInto('blocks').values({ blocker_id: C, blocked_id: A, created_at: NOW }).execute(),
    );
    const byBlocked = await as(A, async (trx) => ({
      profile: await trx
        .selectFrom('profiles')
        .select('user_id')
        .where('user_id', '=', C)
        .execute(),
    }));
    expect(byBlocked.profile).toEqual([]);
    const byBlocker = await as(C, async (trx) => ({
      profile: await trx
        .selectFrom('profiles')
        .select('user_id')
        .where('user_id', '=', A)
        .execute(),
      posts: await trx.selectFrom('posts').select('id').execute(),
    }));
    expect(byBlocker).toEqual({ profile: [], posts: [] });
    const third = await as(B, (trx) => trx.selectFrom('posts').select('id').execute());
    expect(ids(third)).toEqual([published]);
  });

  it('thông báo xã hội: chỉ người nhận đọc được', async () => {
    const id = newId();
    await env.workerDb
      .insertInto('social_notifications')
      .values({ id, owner_id: A, actor_id: B, kind: 'FOLLOW', created_at: NOW })
      .execute();
    const byOther = await as(B, (trx) =>
      trx.selectFrom('social_notifications').select('id').execute(),
    );
    const byOwner = await as(A, (trx) =>
      trx.selectFrom('social_notifications').select('id').execute(),
    );
    expect(byOther).toEqual([]);
    expect(ids(byOwner)).toEqual([id]);
  });
});
