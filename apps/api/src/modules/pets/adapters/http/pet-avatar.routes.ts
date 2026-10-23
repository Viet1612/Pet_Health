import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { removeAvatar } from '../../application/remove-avatar.js';
import { setAvatar } from '../../application/set-avatar.js';
import type { PetsRouteDeps } from './pets.routes.js';
import { ownerOf, petIdOf, zPetParams } from './pets.schemas.js';

/** `PUT/DELETE /pets/{petId}/avatar` (US-012). */
export const petAvatarRoutes: FastifyPluginAsyncZod<PetsRouteDeps> = (app, deps) => {
  app.put(
    '/pets/:petId/avatar',
    {
      schema: {
        tags: ['pets'],
        summary: 'Đặt / thay ảnh đại diện (multipart, field `file`, ≤ 5 MB)',
        description:
          'Không cần Idempotency-Key (PUT thay thế). Ảnh xử lý nền; hỏi trạng thái ở GET /uploads/{uploadId}.',
        consumes: ['multipart/form-data'],
        params: zPetParams,
        response: {
          202: z.object({ uploadId: z.uuid(), status: z.literal('PROCESSING') }),
        },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const petId = petIdOf(req.params.petId);
      const accepted = await setAvatar(
        { pets: deps.pets, media: deps.media, withTx: (fn) => req.withTx(fn) },
        req,
        ownerId,
        petId,
      );
      return reply.code(202).send(accepted);
    },
  );

  app.delete(
    '/pets/:petId/avatar',
    {
      schema: {
        tags: ['pets'],
        summary: 'Gỡ ảnh đại diện',
        params: zPetParams,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const petId = petIdOf(req.params.petId);
      await req.withTx((trx) => removeAvatar(deps, trx, ownerId, petId));
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
