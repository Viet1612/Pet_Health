import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { runIdempotent, sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import { createPet } from '../../application/create-pet.js';
import { getPet } from '../../application/get-pet.js';
import { listPets } from '../../application/list-pets.js';
import type { PetsAppDeps } from '../../application/pets-deps.js';
import { updatePet } from '../../application/update-pet.js';
import { PET_SEXES } from '../../domain/pet.js';

/** Thú cưng trả về client (SAD §2.4.2). */
export const zPet = z.object({
  id: z.uuid(),
  name: z.string(),
  breed: z.string(),
  sex: z.enum(PET_SEXES),
  birthDate: z.iso.date(),
  ageText: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  avatarThumbUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Kiểu dữ liệu kiểm ở Zod; nội dung (bắt buộc, độ dài, ngày) kiểm ở domain/pet.ts để trả mã lỗi
// riêng (REQUIRED, FUTURE_DATE...).
const petFields = {
  name: z.string().optional(),
  breed: z.string().optional(),
  sex: z.string().optional().describe('MALE | FEMALE'),
  birthDate: z.string().optional().describe('YYYY-MM-DD, không sau hôm nay'),
  description: z.string().nullable().optional(),
};
const zPetCreate = z.object(petFields);
const zPetPatch = z.object(petFields).refine((o) => Object.keys(o).length > 0, {
  error: 'Cần ít nhất một trường',
});

// Không dùng zUuid ở params: ID sai định dạng trả 404 như ID không tồn tại (FR-AUTH-013).
const zPetParams = z.object({ petId: z.string() });

function ownerOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

function petIdOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}

/** `GET/POST /pets`, `GET/PATCH /pets/{petId}` (US-010, 011, 013, 015). */
export const petsRoutes: FastifyPluginAsyncZod<PetsAppDeps> = (app, deps) => {
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
      return { items: await req.withTx((trx) => listPets(deps, trx, ownerId)) };
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
          async () => ({ status: 201, body: await createPet(deps, trx, ownerId, req.body) }),
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
      return req.withTx((trx) => getPet(deps, trx, ownerId, petId));
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
      return req.withTx((trx) => updatePet(deps, trx, ownerId, petId, req.body));
    },
  );

  return Promise.resolve();
};
