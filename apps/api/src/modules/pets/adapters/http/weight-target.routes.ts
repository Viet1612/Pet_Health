import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { clearWeightTarget, setWeightTarget } from '../../application/weight-target.js';
import type { PetsRouteDeps } from './pets.routes.js';
import { ownerOf, petIdOf, zPetParams } from './pets.schemas.js';

/** `PUT/DELETE /pets/{petId}/weight-target` (US-023). Mục tiêu thuộc mô-đun pets (SAD §2.2.1). */
export const weightTargetRoutes: FastifyPluginAsyncZod<PetsRouteDeps> = (app, deps) => {
  app.put(
    '/pets/:petId/weight-target',
    {
      schema: {
        tags: ['weights'],
        summary: 'Đặt cân nặng mục tiêu',
        params: zPetParams,
        body: z.object({ weightKg: z.string().describe('kg, dấu chấm, ví dụ "9.0"') }),
        response: { 200: z.object({ weightKg: z.string() }) },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = petIdOf(req.params.petId);
      return req.withTx((trx) => setWeightTarget(deps, trx, ownerId, petId, req.body.weightKg));
    },
  );

  app.delete(
    '/pets/:petId/weight-target',
    {
      schema: {
        tags: ['weights'],
        summary: 'Xóa cân nặng mục tiêu',
        params: zPetParams,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const petId = petIdOf(req.params.petId);
      await req.withTx((trx) => clearWeightTarget(deps, trx, ownerId, petId));
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
