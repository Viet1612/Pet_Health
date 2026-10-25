import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import type { RateLimiter } from '../../../../platform/rate-limit/rate-limiter.js';
import {
  checkUsername,
  getMyProfile,
  getProfile,
  removeUserAvatar,
  setUserAvatar,
  upsertMyProfile,
  type SocialDeps,
} from '../../application/profiles.js';

export interface SocialRouteDeps extends SocialDeps {
  rateLimiter: RateLimiter;
}

function userOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

const zMyProfile = z.object({
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarThumbUrl: z.string().nullable(),
  usernameChangeInDays: z.number().int().describe('0 = đổi username được ngay'),
});

const zProfile = z.object({
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  avatarThumbUrl: z.string().nullable(),
  postCount: z.number().int(),
  followerCount: z.number().int(),
  followingCount: z.number().int(),
  isMe: z.boolean(),
  followedByMe: z.boolean(),
});

/** Hồ sơ công khai (F-02). Chỉ người đã đăng nhập; không trả email hay dữ liệu sức khỏe. */
export const profilesRoutes: FastifyPluginAsyncZod<SocialRouteDeps> = (app, deps) => {
  app.get(
    '/me/profile',
    {
      schema: {
        tags: ['social'],
        summary: 'Hồ sơ công khai của tôi (404 PROFILE_NOT_SET nếu chưa tạo)',
        response: { 200: z.object({ profile: zMyProfile }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return { profile: await req.withTx((trx) => getMyProfile(deps, trx, userId)) };
    },
  );

  app.put(
    '/me/profile',
    {
      schema: {
        tags: ['social'],
        summary: 'Tạo hoặc sửa hồ sơ công khai (đổi username tối đa 1 lần/14 ngày)',
        body: z.strictObject({
          username: z.string().describe('3–30 ký tự a-z 0-9 . _'),
          displayName: z.string(),
          bio: z.string().nullable().optional(),
        }),
        response: { 200: z.object({ profile: zMyProfile }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return {
        profile: await req.withTx((trx) => upsertMyProfile(deps, trx, userId, req.body)),
      };
    },
  );

  app.get(
    '/profiles/check',
    {
      schema: {
        tags: ['social'],
        summary: 'Kiểm username hợp lệ và còn trống',
        querystring: z.object({ username: z.string().default('') }),
        response: { 200: z.object({ valid: z.boolean(), available: z.boolean() }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      await deps.rateLimiter.hit(`username-check:${userId}`, 30, 60);
      return req.withTx((trx) => checkUsername(trx, userId, req.query.username));
    },
  );

  app.get(
    '/profiles/:username',
    {
      schema: {
        tags: ['social'],
        summary: 'Xem hồ sơ theo username (không có hoặc đã chặn nhau → 404)',
        params: z.object({ username: z.string() }),
        response: { 200: z.object({ profile: zProfile }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return {
        profile: await req.withTx((trx) => getProfile(deps, trx, userId, req.params.username)),
      };
    },
  );

  app.put(
    '/me/avatar',
    {
      schema: {
        tags: ['social'],
        summary: 'Đặt / thay ảnh đại diện hồ sơ (multipart, field `file`, ≤ 5 MB)',
        description: 'Cần có hồ sơ. Ảnh xử lý nền; hỏi trạng thái ở GET /uploads/{uploadId}.',
        consumes: ['multipart/form-data'],
        response: { 202: z.object({ uploadId: z.uuid(), status: z.literal('PROCESSING') }) },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const accepted = await setUserAvatar(deps, (fn) => req.withTx(fn), req, userId);
      return reply.code(202).send(accepted);
    },
  );

  app.delete(
    '/me/avatar',
    {
      schema: {
        tags: ['social'],
        summary: 'Gỡ ảnh đại diện hồ sơ',
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      await req.withTx((trx) => removeUserAvatar(deps, trx, userId));
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
