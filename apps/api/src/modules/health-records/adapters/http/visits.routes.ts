import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { runIdempotent, sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import { createVisit } from '../../application/create-visit.js';
import { deleteVisit } from '../../application/delete-visit.js';
import { getVisit } from '../../application/get-visit.js';
import { listVisits, VISIT_PAGE_DEFAULT } from '../../application/list-visits.js';
import type { HealthRecordsAppDeps } from '../../application/ports.js';
import { updateVisit } from '../../application/update-visit.js';

export const zVisitPhoto = z.object({
  id: z.uuid(),
  status: z.enum(['PROCESSING', 'READY']),
  thumbUrl: z.string().nullable(),
  url: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

const zVisit = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  visitedOn: z.iso.date(),
  symptoms: z.string().nullable(),
  diagnosis: z.string().nullable(),
  prescription: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  photos: z.array(zVisitPhoto),
});

const zVisitSummary = z.object({
  id: z.uuid(),
  visitedOn: z.iso.date(),
  diagnosis: z.string().nullable(),
  symptoms: z.string().nullable(),
  photoCount: z.number().int(),
});

// Nội dung (độ dài, "cần triệu chứng hoặc chẩn đoán", ngày) kiểm ở domain để trả mã lỗi riêng.
const zText = z.string().nullable().optional().describe('≤ 2000 ký tự; null hoặc "" để xóa');
const zVisitInput = z.object({
  visitedOn: z.string().optional().describe('YYYY-MM-DD, mặc định hôm nay, không sau hôm nay'),
  symptoms: zText,
  diagnosis: zText,
  prescription: zText,
});

function ownerOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

/** ID sai định dạng → 404 như không tồn tại (FR-AUTH-013). */
function uuidOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}

/** Sổ y tế (US-030→032): bản ghi khám của một thú cưng. */
export const visitsRoutes: FastifyPluginAsyncZod<HealthRecordsAppDeps> = (app, deps) => {
  app.get(
    '/pets/:petId/visits',
    {
      schema: {
        tags: ['visits'],
        summary: 'Danh sách bản ghi khám (mới nhất trước, phân trang keyset)',
        params: z.object({ petId: z.string() }),
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50).default(VISIT_PAGE_DEFAULT),
          cursor: z.string().optional(),
        }),
        response: {
          200: z.object({
            items: z.array(zVisitSummary),
            nextCursor: z.string().nullable(),
            totalCount: z.number().int(),
          }),
        },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = uuidOf(req.params.petId);
      return req.withTx((trx) => listVisits(deps, trx, ownerId, petId, req.query));
    },
  );

  app.post(
    '/pets/:petId/visits',
    {
      config: { idempotent: true },
      schema: {
        tags: ['visits'],
        summary: 'Thêm bản ghi khám',
        params: z.object({ petId: z.string() }),
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: zVisitInput,
        response: { 201: zVisit },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const petId = uuidOf(req.params.petId);
      const idem = req.idempotency;
      if (!idem) throw new Error('Thiếu thông tin Idempotency-Key');
      const result = await req.withTx((trx) =>
        runIdempotent(
          trx,
          { ownerId, key: idem.key, requestHash: idem.requestHash, now: deps.clock.now() },
          async () => ({
            status: 201,
            body: await createVisit(deps, trx, ownerId, petId, req.body),
          }),
        ),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.get(
    '/visits/:id',
    {
      schema: {
        tags: ['visits'],
        summary: 'Chi tiết bản ghi khám',
        params: z.object({ id: z.string() }),
        response: { 200: zVisit },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => getVisit(deps, trx, ownerId, id));
    },
  );

  app.patch(
    '/visits/:id',
    {
      schema: {
        tags: ['visits'],
        summary: 'Sửa bản ghi khám',
        params: z.object({ id: z.string() }),
        body: zVisitInput.refine((o) => Object.keys(o).length > 0, {
          error: 'Cần ít nhất một trường',
        }),
        response: { 200: zVisit },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => updateVisit(deps, trx, ownerId, id, req.body));
    },
  );

  app.delete(
    '/visits/:id',
    {
      schema: {
        tags: ['visits'],
        summary: 'Xóa bản ghi khám và mọi ảnh đính kèm',
        params: z.object({ id: z.string() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      await req.withTx((trx) => deleteVisit(deps, trx, ownerId, id));
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
