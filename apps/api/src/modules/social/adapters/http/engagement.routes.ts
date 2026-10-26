import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import { listActivity, readAllActivity } from '../../application/activity.js';
import {
  addComment,
  COMMENT_MAX,
  deleteComment,
  likePost,
  listComments,
  listLikers,
  unlikePost,
  type EngagementDeps,
} from '../../application/engagement.js';

function userOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

/** ID sai định dạng → 404 như không tồn tại (FR-AUTH-013). */
function uuidOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}

const zAuthor = z.object({
  username: z.string(),
  displayName: z.string(),
  avatarThumbUrl: z.string().nullable(),
});
const zComment = z.object({
  id: z.uuid(),
  author: zAuthor,
  body: z.string(),
  createdAt: z.iso.datetime(),
  canDelete: z.boolean(),
});
const zPerson = zAuthor.extend({ followedByMe: z.boolean(), isMe: z.boolean() });
const zLikeState = z.object({ liked: z.boolean(), likeCount: z.number().int() });
const zIdParams = z.object({ id: z.string() });

/** Tim, bình luận (F-09) và thông báo hoạt động (F-11). */
export const engagementRoutes: FastifyPluginAsyncZod<EngagementDeps> = (app, deps) => {
  app.put(
    '/posts/:id/like',
    {
      schema: {
        tags: ['social'],
        summary: 'Thả tim (idempotent)',
        params: zIdParams,
        response: { 200: zLikeState },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => likePost(deps, trx, userId, id));
    },
  );

  app.delete(
    '/posts/:id/like',
    {
      schema: {
        tags: ['social'],
        summary: 'Bỏ tim (idempotent)',
        params: zIdParams,
        response: { 200: zLikeState },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => unlikePost(trx, userId, id));
    },
  );

  app.get(
    '/posts/:id/likes',
    {
      schema: {
        tags: ['social'],
        summary: 'Người thả tim (tối đa 100, mới nhất trước)',
        params: zIdParams,
        response: { 200: z.object({ items: z.array(zPerson) }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => listLikers(deps, trx, userId, id));
    },
  );

  app.get(
    '/posts/:id/comments',
    {
      schema: {
        tags: ['social'],
        summary: 'Bình luận, cũ trước, 20/trang',
        params: zIdParams,
        querystring: z.object({ cursor: z.string().optional() }),
        response: {
          200: z.object({ items: z.array(zComment), nextCursor: z.string().nullable() }),
        },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => listComments(deps, trx, userId, id, req.query.cursor));
    },
  );

  app.post(
    '/posts/:id/comments',
    {
      config: { idempotent: true },
      schema: {
        tags: ['social'],
        summary: 'Viết bình luận (1–500 ký tự); 30 bình luận/10 phút',
        description: 'Bắt buộc Idempotency-Key.',
        params: zIdParams,
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: z.strictObject({
          body: z
            .string()
            .default('')
            .describe(`1–${String(COMMENT_MAX)} ký tự`),
        }),
        response: { 201: z.object({ comment: zComment }) },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      const idem = req.idempotency;
      if (!idem) throw new Error('Thiếu thông tin Idempotency-Key');
      const result = await req.withTx((trx) =>
        addComment(
          deps,
          trx,
          userId,
          id,
          req.body.body,
          { ...idem, ownerId: userId, now: deps.clock.now() },
          req.auth?.accountCreatedAt,
        ),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.delete(
    '/comments/:id',
    {
      schema: {
        tags: ['social'],
        summary: 'Xóa bình luận (người viết hoặc chủ bài)',
        params: zIdParams,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      await req.withTx((trx) => deleteComment(trx, userId, id));
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/social-notifications',
    {
      schema: {
        tags: ['social'],
        summary: 'Thông báo hoạt động (tim gộp theo bài, bình luận, theo dõi), 30/trang',
        querystring: z.object({ cursor: z.string().optional() }),
        response: {
          200: z.object({
            items: z.array(
              z.object({
                id: z.uuid(),
                kind: z.enum(['LIKE', 'COMMENT', 'FOLLOW']),
                actors: z.array(zAuthor),
                actorCount: z.number().int(),
                post: z.object({ id: z.uuid(), thumbUrl: z.string().nullable() }).nullable(),
                commentId: z.uuid().nullable(),
                commentExcerpt: z.string().nullable(),
                unread: z.boolean(),
                createdAt: z.iso.datetime(),
              }),
            ),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => listActivity(deps, trx, userId, req.query.cursor));
    },
  );

  app.post(
    '/social-notifications/read-all',
    {
      schema: {
        tags: ['social'],
        summary: 'Đánh dấu đã xem mọi thông báo hoạt động tạo trước `upTo`',
        body: z.strictObject({ upTo: z.iso.datetime({ offset: true }).optional() }),
        response: { 200: z.object({ updated: z.number().int() }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const now = deps.clock.now();
      const upTo = req.body.upTo ? new Date(req.body.upTo) : now;
      return { updated: await req.withTx((trx) => readAllActivity(trx, userId, upTo, now)) };
    },
  );

  return Promise.resolve();
};
