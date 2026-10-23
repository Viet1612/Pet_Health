import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { runIdempotent, sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import { addWeightEntry } from '../../application/add-weight-entry.js';
import { deleteWeightEntry } from '../../application/delete-weight-entry.js';
import { listWeights } from '../../application/list-weights.js';
import type { HealthRecordsAppDeps } from '../../application/ports.js';
import { updateWeightEntry } from '../../application/update-weight-entry.js';

const zWeightEntry = z.object({
  id: z.uuid(),
  measuredOn: z.iso.date(),
  weightKg: z.string().describe('kg, dấu chấm, 1 chữ số thập phân: "9.2"'),
  createdAt: z.iso.datetime(),
});

const zWeightsView = z.object({
  items: z.array(zWeightEntry),
  target: z.string().nullable(),
  latest: zWeightEntry.nullable(),
  deltaFromPrevious: z.string().nullable(),
});

const zKg = z.string().describe('kg, dấu chấm: "9.2" (client đổi "," thành ".")');
const zDate = z.string().describe('YYYY-MM-DD, không sau hôm nay');

function ownerOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

/** ID sai định dạng → 404 như không tồn tại (FR-AUTH-013). */
function uuidOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}

/** Số đo cân nặng (US-020→022): `GET/POST /pets/{petId}/weights`, `PATCH/DELETE /weights/{id}`. */
export const weightsRoutes: FastifyPluginAsyncZod<HealthRecordsAppDeps> = (app, deps) => {
  app.get(
    '/pets/:petId/weights',
    {
      schema: {
        tags: ['weights'],
        summary: 'Số đo cân nặng, mục tiêu, số đo mới nhất và chênh lệch',
        params: z.object({ petId: z.string() }),
        querystring: z.object({ from: z.string().optional(), to: z.string().optional() }),
        response: { 200: zWeightsView },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = uuidOf(req.params.petId);
      return req.withTx((trx) => listWeights(deps, trx, ownerId, petId, req.query));
    },
  );

  app.post(
    '/pets/:petId/weights',
    {
      config: { idempotent: true },
      schema: {
        tags: ['weights'],
        summary: 'Ghi số đo cân nặng',
        params: z.object({ petId: z.string() }),
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: z.object({ weightKg: zKg, measuredOn: zDate.optional() }),
        response: { 201: zWeightEntry },
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
            body: await addWeightEntry(deps, trx, ownerId, petId, req.body),
          }),
        ),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.patch(
    '/weights/:id',
    {
      schema: {
        tags: ['weights'],
        summary: 'Sửa số đo cân nặng',
        params: z.object({ id: z.string() }),
        body: z
          .object({ weightKg: zKg.optional(), measuredOn: zDate.optional() })
          .refine((o) => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường' }),
        response: { 200: zWeightEntry },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => updateWeightEntry(deps, trx, ownerId, id, req.body));
    },
  );

  app.delete(
    '/weights/:id',
    {
      schema: {
        tags: ['weights'],
        summary: 'Xóa số đo cân nặng',
        params: z.object({ id: z.string() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      await req.withTx((trx) => deleteWeightEntry(deps, trx, ownerId, id));
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
