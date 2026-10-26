// F-13: quét rò rỉ. B (người theo dõi A) gọi mọi route đọc của mạng xã hội trên dữ liệu A; phản
// hồi không được chứa email, dữ liệu sức khỏe hay khóa tệp ngoài ảnh bài / ảnh đại diện.
import { sql } from 'kysely';
import { expect } from 'vitest';

import { authHeaders } from '../../../../../../test/idor/accounts.js';
import { registerIdorCustom } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

const SECRET = {
  breed: 'GiongBiMat',
  birthDate: '2019-03-04',
  diagnosis: 'ChanDoanBiMat',
  symptoms: 'TrieuChungBiMat',
  prescription: 'DonThuocBiMat',
  note: 'GhiChuBiMat',
  weight: '7.35',
};
const FORBIDDEN_KEYS = [
  'email',
  'birthDate',
  'birth_date',
  'breed',
  'weight',
  'weightKg',
  'symptoms',
  'diagnosis',
  'prescription',
  'note',
  'storage_key',
  'owner_id',
];

registerIdorCustom(
  'Bản tin: phản hồi đọc không lộ email, sức khỏe, khóa tệp riêng',
  async ({ app, a, b, db }) => {
    const username = `leak_${a.userId.slice(0, 8)}`;
    await sql`
    INSERT INTO profiles (user_id, username, display_name, bio, created_at, updated_at)
    VALUES (${a.userId}, ${username}, 'Chủ A', 'Yêu mèo', now(), now())
    ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username`.execute(db);
    await sql`
    INSERT INTO profiles (user_id, username, display_name, created_at, updated_at)
    VALUES (${b.userId}, ${`leak_${b.userId.slice(0, 8)}`}, 'B', now(), now())
    ON CONFLICT (user_id) DO NOTHING`.execute(db);

    // Dữ liệu sức khỏe của A (không được lộ).
    const petId = newId();
    const visitId = newId();
    await sql`
    INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
    VALUES (${petId}, ${a.userId}, 'Mochi', ${SECRET.breed}, 'FEMALE', ${SECRET.birthDate})`.execute(
      db,
    );
    await sql`
    INSERT INTO visits (id, owner_id, pet_id, visited_on, symptoms, diagnosis, prescription)
    VALUES (${visitId}, ${a.userId}, ${petId}, '2026-10-01', ${SECRET.symptoms}, ${SECRET.diagnosis},
            ${SECRET.prescription})`.execute(db);
    await sql`
    INSERT INTO weight_entries (id, owner_id, pet_id, measured_on, weight_kg)
    VALUES (${newId()}, ${a.userId}, ${petId}, '2026-10-01', ${SECRET.weight})`.execute(db);
    const visitKey = `u/${a.userId}/p/${petId}/v/${visitId}/${newId()}`;
    await sql`
    INSERT INTO visit_photos (id, owner_id, visit_id, storage_key, thumb_key, status)
    VALUES (${newId()}, ${a.userId}, ${visitId}, ${`${visitKey}.jpg`}, ${`${visitKey}_thumb.jpg`},
            'READY')`.execute(db);

    // Bài của A gắn Mochi, có ảnh, tim + bình luận của B; B theo dõi A.
    const postId = newId();
    await sql`
    INSERT INTO posts (id, owner_id, caption, pet_ids, photo_count, status, published_at,
                       created_at, updated_at)
    VALUES (${postId}, ${a.userId}, 'Mochi đi dạo', ${[petId]}, 1, 'PUBLISHED', now(), now(),
            now())`.execute(db);
    const photoKey = `u/${a.userId}/posts/${postId}/${newId()}`;
    await sql`
    INSERT INTO post_photos (id, owner_id, post_id, position, storage_key, thumb_key, width,
                             height, status, created_at)
    VALUES (${newId()}, ${a.userId}, ${postId}, 0, ${`${photoKey}.jpg`}, ${`${photoKey}_thumb.jpg`},
            1080, 810, 'READY', now())`.execute(db);
    await sql`
    INSERT INTO follows (follower_id, followee_id, created_at)
    VALUES (${b.userId}, ${a.userId}, now()) ON CONFLICT DO NOTHING`.execute(db);
    await sql`
    INSERT INTO post_likes (post_id, user_id, created_at) VALUES (${postId}, ${b.userId}, now())`.execute(
      db,
    );
    await sql`
    INSERT INTO post_comments (id, post_id, owner_id, body, created_at)
    VALUES (${newId()}, ${postId}, ${b.userId}, 'Xinh quá', now())`.execute(db);

    const urls = [
      `/api/v1/profiles/${username}`,
      `/api/v1/profiles/${username}/posts`,
      `/api/v1/profiles/${username}/followers`,
      `/api/v1/profiles/${username}/following`,
      `/api/v1/posts/${postId}`,
      `/api/v1/posts/${postId}/likes`,
      `/api/v1/posts/${postId}/comments`,
      `/api/v1/feed`,
      `/api/v1/search/profiles?q=${username}`,
    ];
    for (const url of urls) {
      const res = await app.inject({ method: 'GET', url, headers: authHeaders(b) });
      expect(res.statusCode, `${url}: ${res.body}`).toBe(200);
      const body = res.body;
      for (const value of [a.email, ...Object.values(SECRET)]) {
        expect(body.includes(value), `${url} lộ "${value}"`).toBe(false);
      }
      for (const k of FORBIDDEN_KEYS) {
        expect(body.includes(`"${k}"`), `${url} có trường "${k}"`).toBe(false);
      }
      // Mọi khóa tệp trong URL ảnh chỉ được là ảnh bài hoặc ảnh đại diện hồ sơ.
      for (const match of body.matchAll(/\/media\/(u\/[^?"]+)/g)) {
        expect(match[1], `${url} lộ khóa tệp`).toMatch(
          /^u\/[0-9a-f-]{36}\/(posts|profile\/avatar)\//,
        );
      }
    }
    // Bài vẫn hiện tên thú cưng gắn kèm (chỉ tên).
    const post = await app.inject({
      method: 'GET',
      url: `/api/v1/posts/${postId}`,
      headers: authHeaders(b),
    });
    expect(post.json<{ post: { pets: unknown[] } }>().post.pets).toEqual([
      { id: petId, name: 'Mochi' },
    ]);
  },
);
