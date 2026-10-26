import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { blockUser, listBlocked, unblockUser, type BlocksDeps } from '../../application/blocks.js';

function userOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

const zUsernameParams = z.object({ username: z.string() });

/** Chặn / bỏ chặn, danh sách đã chặn (F-12). Không có báo cáo nội dung (D2). */
export const blocksRoutes: FastifyPluginAsyncZod<BlocksDeps> = (app, deps) => {
  app.put(
    '/blocks/:username',
    {
      schema: {
        tags: ['social'],
        summary: 'Chặn (idempotent): xóa follow hai chiều, tim/bình luận của họ trên bài mình',
        params: zUsernameParams,
        response: { 200: z.object({ blocked: z.boolean() }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => blockUser(deps, trx, userId, req.params.username));
    },
  );

  app.delete(
    '/blocks/:username',
    {
      schema: {
        tags: ['social'],
        summary: 'Bỏ chặn (không khôi phục follow, tim, bình luận đã xóa)',
        params: zUsernameParams,
        response: { 200: z.object({ blocked: z.boolean() }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => unblockUser(trx, userId, req.params.username));
    },
  );

  app.get(
    '/me/blocks',
    {
      schema: {
        tags: ['social'],
        summary: 'Người tôi đã chặn',
        response: {
          200: z.object({
            items: z.array(
              z.object({
                username: z.string(),
                displayName: z.string(),
                avatarThumbUrl: z.string().nullable(),
              }),
            ),
          }),
        },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => listBlocked(deps, trx, userId));
    },
  );

  return Promise.resolve();
};
