import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { runIdempotent, sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import type { RoutinesAppDeps } from '../../application/ports.js';
import {
  createRoutine,
  deleteRoutine,
  listRoutines,
  setRoutineCompletion,
  updateRoutine,
} from '../../application/routines.js';
import {
  ownerOf,
  uuidOf,
  zIdParams,
  zPetParams,
  zRoutine,
  zRoutineChecklist,
  zRoutineCreate,
  zRoutinePatch,
} from './routines.schemas.js';

/** Việc chăm sóc hằng ngày (US-045, 050–053). Ngày luôn do server tính theo múi giờ tài khoản. */
export const routinesRoutes: FastifyPluginAsyncZod<RoutinesAppDeps> = (app, deps) => {
  app.get(
    '/pets/:petId/routines',
    {
      schema: {
        tags: ['routines'],
        summary: 'Checklist hôm nay của thú cưng (việc xong xuống cuối)',
        params: zPetParams,
        response: { 200: zRoutineChecklist },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = uuidOf(req.params.petId);
      return req.withTx((trx) => listRoutines(deps, trx, ownerId, petId));
    },
  );

  app.post(
    '/pets/:petId/routines',
    {
      config: { idempotent: true },
      schema: {
        tags: ['routines'],
        summary: 'Tạo việc hằng ngày (tối đa 20 việc mỗi thú cưng)',
        params: zPetParams,
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: zRoutineCreate,
        response: { 201: zRoutine },
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
            body: await createRoutine(deps, trx, ownerId, petId, req.body),
          }),
        ),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.patch(
    '/routines/:id',
    {
      schema: {
        tags: ['routines'],
        summary: 'Sửa tên hoặc giờ của việc',
        params: zIdParams,
        body: zRoutinePatch,
        response: { 200: zRoutine },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => updateRoutine(deps, trx, ownerId, id, req.body));
    },
  );

  app.delete(
    '/routines/:id',
    {
      schema: {
        tags: ['routines'],
        summary: 'Xóa việc (xóa mềm, giữ lịch sử)',
        params: zIdParams,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      await req.withTx((trx) => deleteRoutine(deps, trx, ownerId, id));
      return reply.code(204).send(null);
    },
  );

  app.put(
    '/routines/:id/completion',
    {
      schema: {
        tags: ['routines'],
        summary: 'Đánh dấu xong / chưa xong cho hôm nay',
        description: 'Idempotent: gửi lặp cùng giá trị vẫn 200. Ngày do server tính.',
        params: zIdParams,
        body: z.object({ done: z.boolean() }),
        response: { 200: z.object({ localDate: z.iso.date(), done: z.boolean() }) },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => setRoutineCompletion(deps, trx, ownerId, id, req.body.done));
    },
  );

  return Promise.resolve();
};
