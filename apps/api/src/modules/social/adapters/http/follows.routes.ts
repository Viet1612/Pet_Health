import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import {
  follow,
  listFollows,
  searchProfiles,
  unfollow,
  type FollowsDeps,
} from '../../application/follows.js';

function userOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

const zPerson = z.object({
  username: z.string(),
  displayName: z.string(),
  avatarThumbUrl: z.string().nullable(),
  followedByMe: z.boolean(),
  blockedByMe: z.boolean(),
  isMe: z.boolean(),
});
const zFollowState = z.object({ following: z.boolean(), followerCount: z.number().int() });
const zUsernameParams = z.object({ username: z.string() });
const zPeoplePage = z.object({ items: z.array(zPerson), nextCursor: z.string().nullable() });

/** Theo dõi, danh sách theo dõi, tìm người (F-07). */
export const followsRoutes: FastifyPluginAsyncZod<FollowsDeps> = (app, deps) => {
  app.put(
    '/follows/:username',
    {
      schema: {
        tags: ['social'],
        summary: 'Theo dõi (idempotent, không cần duyệt); tối đa 200 lần/ngày',
        params: zUsernameParams,
        response: { 200: zFollowState },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => follow(deps, trx, userId, req.params.username));
    },
  );

  app.delete(
    '/follows/:username',
    {
      schema: {
        tags: ['social'],
        summary: 'Bỏ theo dõi (idempotent)',
        params: zUsernameParams,
        response: { 200: zFollowState },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => unfollow(trx, userId, req.params.username));
    },
  );

  for (const side of ['followers', 'following'] as const) {
    app.get(
      `/profiles/:username/${side}`,
      {
        schema: {
          tags: ['social'],
          summary:
            side === 'followers'
              ? 'Người theo dõi (30/trang, mới nhất trước)'
              : 'Đang theo dõi (30/trang, mới nhất trước)',
          params: zUsernameParams,
          querystring: z.object({ cursor: z.string().optional() }),
          response: { 200: zPeoplePage },
        },
      },
      async (req) => {
        const userId = userOf(req);
        return req.withTx((trx) =>
          listFollows(deps, trx, userId, req.params.username, side, req.query.cursor),
        );
      },
    );
  }

  app.get(
    '/search/profiles',
    {
      schema: {
        tags: ['social'],
        summary: 'Tìm người theo username (tiền tố) hoặc tên hiển thị (không dấu); tối đa 20',
        querystring: z.object({ q: z.string().default('') }),
        response: { 200: z.object({ items: z.array(zPerson) }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => searchProfiles(deps, trx, userId, req.query.q));
    },
  );

  return Promise.resolve();
};
