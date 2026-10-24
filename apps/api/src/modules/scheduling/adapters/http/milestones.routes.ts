import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { runIdempotent, sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import { cancelMilestone } from '../../application/cancel-milestone.js';
import { completeMilestone } from '../../application/complete-milestone.js';
import { createMilestone } from '../../application/create-milestone.js';
import { getMilestoneDetail } from '../../application/get-detail.js';
import { listMilestonesByPet } from '../../application/list-by-pet.js';
import type { SchedulingAppDeps } from '../../application/ports.js';
import { undoCompleteMilestone } from '../../application/undo-complete-milestone.js';
import { updateMilestone } from '../../application/update-milestone.js';
import {
  ownerOf,
  uuidOf,
  zIdParams,
  zMilestone,
  zMilestoneCreate,
  zMilestoneDetail,
  zMilestoneGroups,
  zMilestonePatch,
  zPetParams,
} from './milestones.schemas.js';

/** Lịch mốc y tế (US-040, 044, 046, 047). */
export const milestonesRoutes: FastifyPluginAsyncZod<SchedulingAppDeps> = (app, deps) => {
  app.get(
    '/pets/:petId/milestones',
    {
      schema: {
        tags: ['milestones'],
        summary: 'Mốc của thú cưng theo nhóm (sắp tới, quá hạn, đã thực hiện, đã hủy)',
        params: zPetParams,
        response: { 200: zMilestoneGroups },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = uuidOf(req.params.petId);
      return req.withTx((trx) => listMilestonesByPet(deps, trx, ownerId, petId));
    },
  );

  app.post(
    '/pets/:petId/milestones',
    {
      config: { idempotent: true },
      schema: {
        tags: ['milestones'],
        summary: 'Tạo mốc',
        params: zPetParams,
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: zMilestoneCreate,
        response: { 201: zMilestone },
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
            body: await createMilestone(deps, trx, ownerId, petId, req.body),
          }),
        ),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.get(
    '/milestones/:id',
    {
      schema: {
        tags: ['milestones'],
        summary: 'Chi tiết mốc kèm trạng thái nhắc nhở',
        params: zIdParams,
        response: { 200: zMilestoneDetail },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => getMilestoneDetail(deps, trx, ownerId, id));
    },
  );

  app.patch(
    '/milestones/:id',
    {
      schema: {
        tags: ['milestones'],
        summary: 'Sửa mốc (ngày hạn, ghi chú, chu kỳ)',
        params: zIdParams,
        body: zMilestonePatch,
        response: { 200: zMilestone },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => updateMilestone(deps, trx, ownerId, id, req.body));
    },
  );

  app.post(
    '/milestones/:id/cancel',
    {
      schema: {
        tags: ['milestones'],
        summary: 'Hủy mốc',
        params: zIdParams,
        response: { 200: zMilestone },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => cancelMilestone(deps, trx, ownerId, id));
    },
  );

  app.post(
    '/milestones/:id/complete',
    {
      schema: {
        tags: ['milestones'],
        summary: 'Đánh dấu đã thực hiện (tạo mốc kế tiếp, hoàn tác được trong 15 s)',
        description: 'Idempotent theo `doneOn`: gọi lại cùng ngày trả cùng kết quả.',
        params: zIdParams,
        body: z.object({ doneOn: z.string().describe('YYYY-MM-DD, không sau hôm nay') }),
        response: {
          200: z.object({
            milestone: zMilestone,
            nextMilestone: zMilestone.nullable(),
            resolvedNotificationIds: z.array(z.uuid()),
            undoExpiresAt: z.iso.datetime(),
          }),
        },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => completeMilestone(deps, trx, ownerId, id, req.body.doneOn));
    },
  );

  app.post(
    '/milestones/:id/undo-complete',
    {
      schema: {
        tags: ['milestones'],
        summary: 'Hoàn tác "đã thực hiện" (trong 15 s)',
        params: zIdParams,
        response: { 200: z.object({ milestone: zMilestone }) },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const id = uuidOf(req.params.id);
      return req.withTx((trx) => undoCompleteMilestone(deps, trx, ownerId, id));
    },
  );

  return Promise.resolve();
};
