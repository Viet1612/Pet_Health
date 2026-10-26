import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import {
  attachPostPhoto,
  CAPTION_MAX,
  createPost,
  deletePost,
  feedNewCount,
  getPost,
  listFeed,
  listProfilePosts,
  MAX_PETS,
  MAX_PHOTOS,
  removeDraftPhoto,
  updatePost,
  type PostsDeps,
} from '../../application/posts.js';

function userOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

/** ID sai định dạng → 404 như không tồn tại (FR-AUTH-013). */
function uuidOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}

function idemOf(req: FastifyRequest) {
  const idem = req.idempotency;
  if (!idem) throw new Error('Thiếu thông tin Idempotency-Key');
  return idem;
}

const zPetIds = z
  .array(z.uuid({ error: 'ID thú cưng không hợp lệ' }))
  .describe(`0–${String(MAX_PETS)} thú cưng của mình; bỏ trống = không gắn`);

const zPostView = z.object({
  id: z.uuid(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  author: z.object({
    username: z.string(),
    displayName: z.string(),
    avatarThumbUrl: z.string().nullable(),
  }),
  caption: z.string().nullable(),
  pets: z.array(z.object({ id: z.uuid(), name: z.string() })),
  photos: z.array(
    z.object({
      id: z.uuid(),
      position: z.number().int(),
      status: z.enum(['PROCESSING', 'READY', 'FAILED']),
      url: z.string().nullable(),
      thumbUrl: z.string().nullable(),
      width: z.number().int().nullable(),
      height: z.number().int().nullable(),
    }),
  ),
  photoCount: z.number().int(),
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  likedByMe: z.boolean(),
  createdAt: z.iso.datetime(),
  isMine: z.boolean(),
});

/** Bài đăng (F-04): tạo nháp → tải ảnh → tự đăng khi đủ ảnh; sửa chú thích; xóa; xem. */
export const postsRoutes: FastifyPluginAsyncZod<PostsDeps> = (app, deps) => {
  app.post(
    '/posts',
    {
      config: { idempotent: true },
      schema: {
        tags: ['social'],
        summary: 'Tạo bài nháp (bước 1); tải ảnh ở POST /posts/{id}/photos',
        description: 'Bắt buộc Idempotency-Key. Tối đa 30 bài/ngày → 429 POST_LIMIT_REACHED.',
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: z.strictObject({
          caption: z
            .string()
            .nullable()
            .optional()
            .describe(`≤ ${String(CAPTION_MAX)} ký tự`),
          petIds: zPetIds.optional(),
          photoCount: z
            .number({ error: 'Trường bắt buộc' })
            .int()
            .min(1, { error: 'Cần ít nhất 1 ảnh' })
            .max(MAX_PHOTOS, { error: `Tối đa ${String(MAX_PHOTOS)} ảnh` }),
        }),
        response: { 201: z.object({ id: z.uuid(), status: z.literal('DRAFT') }) },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const idem = { ...idemOf(req), ownerId: userId, now: deps.clock.now() };
      const result = await req.withTx((trx) => createPost(deps, trx, userId, req.body, idem));
      return sendIdempotent(reply, result);
    },
  );

  app.post(
    '/posts/:id/photos',
    {
      config: { idempotent: true },
      schema: {
        tags: ['social'],
        summary: 'Tải một ảnh của bài nháp (multipart, field `file`, ≤ 5 MB)',
        description:
          'Bắt buộc Idempotency-Key. `position` 0..photoCount−1; vị trí có ảnh lỗi thì được thay. Ảnh cuối READY → bài PUBLISHED.',
        consumes: ['multipart/form-data'],
        params: z.object({ id: z.string() }),
        querystring: z.object({
          position: z.coerce
            .number()
            .int()
            .min(0)
            .max(MAX_PHOTOS - 1)
            .default(0),
        }),
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        response: {
          202: z.object({
            photoId: z.uuid(),
            uploadId: z.uuid(),
            status: z.literal('PROCESSING'),
          }),
        },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const result = await attachPostPhoto(
        { ...deps, withTx: (fn) => req.withTx(fn) },
        req,
        userId,
        uuidOf(req.params.id),
        req.query.position,
        idemOf(req),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.delete(
    '/post-photos/:id',
    {
      schema: {
        tags: ['social'],
        summary: 'Bỏ một ảnh (thường là ảnh lỗi) khỏi bài nháp rồi đăng với số ảnh còn lại',
        params: z.object({ id: z.string() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const photoId = uuidOf(req.params.id);
      await req.withTx((trx) => removeDraftPhoto(deps, trx, userId, photoId));
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/posts/:id',
    {
      schema: {
        tags: ['social'],
        summary: 'Xem một bài (bài nháp chỉ chủ thấy)',
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ post: zPostView }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      return { post: await req.withTx((trx) => getPost(deps, trx, userId, id)) };
    },
  );

  app.patch(
    '/posts/:id',
    {
      schema: {
        tags: ['social'],
        summary: 'Sửa chú thích và/hoặc thú cưng gắn kèm (không đổi ảnh)',
        params: z.object({ id: z.string() }),
        body: z
          .strictObject({
            caption: z.string().nullable().optional(),
            petIds: zPetIds.optional(),
          })
          .refine((b) => Object.keys(b).length > 0, { error: 'Cần ít nhất một trường' }),
        response: { 200: z.object({ post: zPostView }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      return {
        post: await req.withTx(async (trx) => {
          await updatePost(deps, trx, userId, id, req.body);
          return getPost(deps, trx, userId, id);
        }),
      };
    },
  );

  app.delete(
    '/posts/:id',
    {
      schema: {
        tags: ['social'],
        summary: 'Xóa bài (kèm ảnh, tim, bình luận)',
        params: z.object({ id: z.string() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const userId = userOf(req);
      const id = uuidOf(req.params.id);
      await req.withTx((trx) => deletePost(deps, trx, userId, id));
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/feed',
    {
      schema: {
        tags: ['social'],
        summary: 'Bản tin: bài của mình và người đang theo dõi, 10 bài/trang, mới nhất trước',
        querystring: z.object({ cursor: z.string().optional() }),
        response: {
          200: z.object({ items: z.array(zPostView), nextCursor: z.string().nullable() }),
        },
      },
    },
    async (req) => {
      const userId = userOf(req);
      return req.withTx((trx) => listFeed(deps, trx, userId, req.query.cursor));
    },
  );

  app.get(
    '/feed/new-count',
    {
      schema: {
        tags: ['social'],
        summary: 'Số bài mới của người đang theo dõi sau thời điểm `since`',
        querystring: z.object({ since: z.iso.datetime({ offset: true }).optional() }),
        response: { 200: z.object({ count: z.number().int() }) },
      },
    },
    async (req) => {
      const userId = userOf(req);
      const { since } = req.query;
      if (since === undefined) return { count: 0 };
      return { count: await req.withTx((trx) => feedNewCount(trx, userId, new Date(since))) };
    },
  );

  app.get(
    '/profiles/:username/posts',
    {
      schema: {
        tags: ['social'],
        summary: 'Lưới bài đã đăng của một hồ sơ (18 bài/trang, mới nhất trước)',
        params: z.object({ username: z.string() }),
        querystring: z.object({ cursor: z.string().optional() }),
        response: {
          200: z.object({
            items: z.array(
              z.object({
                id: z.uuid(),
                thumbUrl: z.string().nullable(),
                photoCount: z.number().int(),
              }),
            ),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (req) => {
      userOf(req);
      return req.withTx((trx) =>
        listProfilePosts(deps, trx, req.params.username, req.query.cursor),
      );
    },
  );

  return Promise.resolve();
};
