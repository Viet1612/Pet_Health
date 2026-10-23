import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { runIdempotent, sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import type { MediaService } from '../../../media/index.js';
import { createPet } from '../../application/create-pet.js';
import { getPet } from '../../application/get-pet.js';
import { listPets } from '../../application/list-pets.js';
import type { PetsAppDeps } from '../../application/pets-deps.js';
import { updatePet } from '../../application/update-pet.js';
import { toPetDto } from './pet-presenter.js';
import { ownerOf, petIdOf, zPet, zPetCreate, zPetParams, zPetPatch } from './pets.schemas.js';

export type PetsRouteDeps = PetsAppDeps & { media: MediaService };

/** `GET/POST /pets`, `GET/PATCH /pets/{petId}` (US-010, 011, 013, 015). */
export const petsRoutes: FastifyPluginAsyncZod<PetsRouteDeps> = (app, deps) => {
  const sign = (key: string): string => deps.media.signUrl(key);

  app.get(
    '/pets',
    {
      schema: {
        tags: ['pets'],
        summary: 'Danh sách thú cưng',
        response: { 200: z.object({ items: z.array(zPet) }) },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const views = await req.withTx((trx) => listPets(deps, trx, ownerId));
      return { items: views.map((v) => toPetDto(v, sign)) };
    },
  );

  app.post(
    '/pets',
    {
      config: { idempotent: true },
      schema: {
        tags: ['pets'],
        summary: 'Thêm thú cưng (tối đa 10)',
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        body: zPetCreate,
        response: { 201: zPet },
      },
    },
    async (req, reply) => {
      const ownerId = ownerOf(req);
      const idem = req.idempotency;
      if (!idem) throw new Error('Thiếu thông tin Idempotency-Key');
      const result = await req.withTx((trx) =>
        runIdempotent(
          trx,
          { ownerId, key: idem.key, requestHash: idem.requestHash, now: deps.clock.now() },
          async () => ({
            status: 201,
            body: toPetDto(await createPet(deps, trx, ownerId, req.body), sign),
          }),
        ),
      );
      return sendIdempotent(reply, result);
    },
  );

  app.get(
    '/pets/:petId',
    {
      schema: {
        tags: ['pets'],
        summary: 'Hồ sơ thú cưng',
        params: zPetParams,
        response: { 200: zPet },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = petIdOf(req.params.petId);
      return toPetDto(await req.withTx((trx) => getPet(deps, trx, ownerId, petId)), sign);
    },
  );

  app.patch(
    '/pets/:petId',
    {
      schema: {
        tags: ['pets'],
        summary: 'Sửa hồ sơ thú cưng',
        params: zPetParams,
        body: zPetPatch,
        response: { 200: zPet },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const petId = petIdOf(req.params.petId);
      const view = await req.withTx((trx) => updatePet(deps, trx, ownerId, petId, req.body));
      return toPetDto(view, sign);
    },
  );

  return Promise.resolve();
};
